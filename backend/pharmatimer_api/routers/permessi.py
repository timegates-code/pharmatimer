"""Router CRUD permessi caregiver scoped admin-on-paziente.

NEW F3-S4-beta N+5.E-beta CP1 -- 4 endpoint:
  - GET    /api/permessi              lista bidirezionale (current=caregiver OR current=paziente)
  - POST   /api/permessi              grant admin-on-paziente 201
  - PUT    /api/permessi/{id}         update (permesso e/o notifiche) admin-on-paziente 200
  - DELETE /api/permessi/{id}         revoke HARD DELETE admin-on-paziente + self-protection 200

Pattern Lesson #25 (autocommit pool transaction implicit-then-commit):
  - GET: SELECT + autoclose (no commit)
  - POST: INSERT + commit() + SELECT re-fetch
  - PUT: SELECT + UPDATE + commit() + SELECT re-fetch
  - DELETE: SELECT + DELETE + commit()
"""
# SENTINEL_N5E_BETA_CP1_ROUTER_PERMESSI
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, status
from mysql.connector import IntegrityError

from pharmatimer_api.db.dependencies import (
    CurrentUser,
    assert_admin_on_paziente,
    get_current_user,
    get_db,
)
from pharmatimer_api.exceptions import RepositoryError, RepositoryErrorCode
from pharmatimer_api.models.permesso import (
    PermessoCreate,
    PermessoResponse,
    PermessoUpdate,
)

router = APIRouter(prefix="/api/permessi", tags=["permessi"])


@router.get("", response_model=List[PermessoResponse])
def list_permessi(
    current_user: CurrentUser = Depends(get_current_user),
    conn=Depends(get_db),
) -> List[PermessoResponse]:
    """List permessi visible to current_user (bidirectional scope).

    Returns rows where current_user is caregiver_id OR paziente_id.
    Ordered by created_at DESC for audit visibility.
    """
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT id, caregiver_id, paziente_id, permesso,
                   notifiche_caregiver_attive, created_at
            FROM permessi
            WHERE caregiver_id = %s OR paziente_id = %s
            ORDER BY created_at DESC
            """,
            (current_user.id, current_user.id),
        )
        rows = cursor.fetchall()
        return [PermessoResponse(**row) for row in rows]
    finally:
        cursor.close()


@router.post(
    "",
    response_model=PermessoResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_permesso(
    payload: PermessoCreate,
    current_user: CurrentUser = Depends(get_current_user),
    conn=Depends(get_db),
) -> PermessoResponse:
    """Grant new permesso (admin-on-paziente required).

    Lesson #25: INSERT + commit() implicit transaction (autocommit pool).
    Catches:
      - UNIQUE (caregiver_id, paziente_id) errno 1062 -> 409
      - FK violation caregiver_id/paziente_id errno 1452 -> 404
    """
    assert_admin_on_paziente(current_user, payload.paziente_id, conn)

    cursor = conn.cursor(dictionary=True)
    try:
        try:
            cursor.execute(
                """
                INSERT INTO permessi
                    (caregiver_id, paziente_id, permesso, notifiche_caregiver_attive)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    payload.caregiver_id,
                    payload.paziente_id,
                    payload.permesso,
                    bool(payload.notifiche_caregiver_attive),
                ),
            )
            new_id = cursor.lastrowid
            conn.commit()
        except IntegrityError as exc:
            conn.rollback()
            errno = getattr(exc, "errno", None)
            if errno == 1062:
                raise RepositoryError(
                    RepositoryErrorCode.CONSTRAINT_VIOLATION,
                    (
                        "Permesso gia esistente per "
                        f"caregiver_id={payload.caregiver_id} "
                        f"paziente_id={payload.paziente_id}"
                    ),
                ) from exc
            if errno == 1452:
                raise RepositoryError(
                    RepositoryErrorCode.NOT_FOUND,
                    (
                        f"Utente caregiver_id={payload.caregiver_id} "
                        f"o paziente_id={payload.paziente_id} non esiste"
                    ),
                ) from exc
            raise

        cursor.execute(
            """
            SELECT id, caregiver_id, paziente_id, permesso,
                   notifiche_caregiver_attive, created_at
            FROM permessi WHERE id = %s
            """,
            (new_id,),
        )
        row = cursor.fetchone()
        return PermessoResponse(**row)
    finally:
        cursor.close()


@router.put("/{permesso_id}", response_model=PermessoResponse)
def update_permesso(
    permesso_id: int,
    payload: PermessoUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    conn=Depends(get_db),
) -> PermessoResponse:
    """Update permesso (admin-on-paziente required).

    Empty body -> 200 no-op idempotent (row unchanged).
    Dynamic UPDATE only on provided fields.
    """
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, paziente_id FROM permessi WHERE id = %s",
            (permesso_id,),
        )
        row = cursor.fetchone()
        if row is None:
            raise RepositoryError(
                RepositoryErrorCode.NOT_FOUND,
                f"Permesso id={permesso_id} non trovato",
            )

        assert_admin_on_paziente(current_user, row["paziente_id"], conn)

        updates = []
        params: list = []
        if payload.permesso is not None:
            updates.append("permesso = %s")
            params.append(payload.permesso)
        if payload.notifiche_caregiver_attive is not None:
            updates.append("notifiche_caregiver_attive = %s")
            params.append(bool(payload.notifiche_caregiver_attive))

        if updates:
            params.append(permesso_id)
            cursor.execute(
                "UPDATE permessi SET " + ", ".join(updates) + " WHERE id = %s",
                tuple(params),
            )
            conn.commit()

        cursor.execute(
            """
            SELECT id, caregiver_id, paziente_id, permesso,
                   notifiche_caregiver_attive, created_at
            FROM permessi WHERE id = %s
            """,
            (permesso_id,),
        )
        updated = cursor.fetchone()
        return PermessoResponse(**updated)
    finally:
        cursor.close()


@router.delete("/{permesso_id}")
def delete_permesso(
    permesso_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    conn=Depends(get_db),
) -> dict:
    """Revoke permesso (admin-on-paziente required + self-protection).

    Self-permission row (caregiver_id == paziente_id) blocked 409.
    HARD DELETE row (frees UNIQUE constraint for re-grant).
    """
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, caregiver_id, paziente_id FROM permessi WHERE id = %s",
            (permesso_id,),
        )
        row = cursor.fetchone()
        if row is None:
            raise RepositoryError(
                RepositoryErrorCode.NOT_FOUND,
                f"Permesso id={permesso_id} non trovato",
            )

        if row["caregiver_id"] == row["paziente_id"]:
            raise RepositoryError(
                RepositoryErrorCode.CONSTRAINT_VIOLATION,
                "Self-permission non eliminabile (auto-permesso protetto)",
            )

        assert_admin_on_paziente(current_user, row["paziente_id"], conn)

        cursor.execute("DELETE FROM permessi WHERE id = %s", (permesso_id,))
        conn.commit()
        return {"deleted": True, "id": permesso_id}
    finally:
        cursor.close()
