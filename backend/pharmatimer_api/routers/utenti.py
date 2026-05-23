"""
PharmaTimer F3-S4-alpha CP1 N+5.E-alpha
Utenti CRUD endpoints: POST (create paziente|caregiver) + DELETE (soft-deactivate).

Both endpoints owner-only via Depends(get_current_owner).

Ratifiche (par.22.85 + par.11.I-S3):
- Q5  POST: owner-only -> 403
- Q6  DELETE: UPDATE attivo=FALSE only (no cascade)
- Q7  DELETE protezioni: (a) owner 409 + (b) self 409 + (c) idempotent 200
- Sub-AMB I: double-INSERT atomic transaction (self + owner permessi)
- Sub-AMB N+5.E-alpha.B: token_plain one-shot 43 char base64url
- Sub-Q-NEW.3: DELETE 404 scope SELECT without attivo filter

CP1 F3-S4-alpha N+5.E-alpha NEW SENTINEL
"""
from __future__ import annotations

import hashlib
import secrets

from fastapi import APIRouter, Depends, status
from mysql.connector.pooling import PooledMySQLConnection

from pharmatimer_api.db.dependencies import (
    CurrentUser,
    get_current_owner,
    get_db,
)
from pharmatimer_api.exceptions import (
    RepositoryError,
    RepositoryErrorCode,
)
from pharmatimer_api.models.utente import (
    UtenteCreate,
    UtenteCreatedResponse,
)

router = APIRouter(prefix="/api", tags=["utenti"])


def _generate_token() -> str:
    """Generate a 43-char base64url token (32 bytes -> base64url).

    Symmetric with seed_owner.py one-shot token pattern (par.22.79-quater).
    """
    return secrets.token_urlsafe(32)


def _hash_token(token_plain: str) -> str:
    """SHA-256 hex digest of plain token, symmetric with get_current_user."""
    return hashlib.sha256(token_plain.encode("utf-8")).hexdigest()


@router.post(
    "/utenti",
    response_model=UtenteCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crea nuovo utente paziente|caregiver (owner-only)",
)
def create_utente(
    payload: UtenteCreate,
    current_owner: CurrentUser = Depends(get_current_owner),
    conn: PooledMySQLConnection = Depends(get_db),
) -> UtenteCreatedResponse:
    """Create new utente with double-INSERT atomic transaction.

    Transaction (sub-AMB I):
      START TRANSACTION
      INSERT utenti (...)
      SET @new_id = LAST_INSERT_ID()
      INSERT permessi (new_id, new_id, 'admin')      -- self-permesso
      INSERT permessi (owner_id, new_id, 'admin')    -- owner-permesso
      COMMIT

    Returns 201 with token_plain (visible ONCE only, not persisted plain).
    """
    token_plain = _generate_token()
    token_hash = _hash_token(token_plain)

    cur = conn.cursor(dictionary=True)
    try:
        # Pool config autocommit=False -> implicit transaction on first INSERT.
        # Do NOT call start_transaction() explicitly. CP2 FIX2 transaction implicit SENTINEL
        try:
            cur.execute(
                "INSERT INTO utenti "
                "(nome_visualizzato, ruolo, token_hash, attivo) "
                "VALUES (%s, %s, %s, TRUE)",
                (payload.nome_visualizzato, payload.ruolo, token_hash),
            )
            new_id = cur.lastrowid

            cur.execute(
                "INSERT INTO permessi "
                "(caregiver_id, paziente_id, permesso, notifiche_caregiver_attive) "
                "VALUES (%s, %s, 'admin', FALSE)",
                (new_id, new_id),
            )
            cur.execute(
                "INSERT INTO permessi "
                "(caregiver_id, paziente_id, permesso, notifiche_caregiver_attive) "
                "VALUES (%s, %s, 'admin', FALSE)",
                (current_owner.id, new_id),
            )

            cur.execute(
                "SELECT id, nome_visualizzato, ruolo, attivo, created_at "
                "FROM utenti WHERE id = %s",
                (new_id,),
            )
            row = cur.fetchone()
            conn.commit()
        except Exception:
            conn.rollback()
            raise
    finally:
        cur.close()

    return UtenteCreatedResponse(
        id=row["id"],
        nome_visualizzato=row["nome_visualizzato"],
        ruolo=row["ruolo"],
        attivo=bool(row["attivo"]),
        created_at=row["created_at"],
        token_plain=token_plain,
    )


@router.delete(
    "/utenti/{utente_id}",
    status_code=status.HTTP_200_OK,
    summary="Soft-deactivate utente (owner-only, no cascade)",
)
def delete_utente(
    utente_id: int,
    current_owner: CurrentUser = Depends(get_current_owner),
    conn: PooledMySQLConnection = Depends(get_db),
) -> dict:
    """Soft-deactivate utente via UPDATE attivo=FALSE.

    Protezioni Q7 (ordering critico):
      1. SELECT target (without attivo filter, Sub-Q-NEW.3) -> 404 if NULL
      2. target.ruolo='owner' -> 409 "Owner non eliminabile" (Q7a)
      3. target.id == current_owner.id -> 409 "Auto-eliminazione" (Q7b defensive,
         Sub-Q-NEW.2: dead-code today via get_current_owner+Q7a, kept for
         future caregiver-with-admin scope)
      4. target.attivo=FALSE -> 200 no-op idempotent (Q7c, Sub-Q-NEW.3)
      5. UPDATE attivo=FALSE -> 200

    No cascade on farmaci/profilo_utente/permessi: scope WHERE attivo=TRUE
    is already enforced in all GET endpoints (Q6).
    """
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT id, ruolo, attivo FROM utenti WHERE id = %s LIMIT 1",
            (utente_id,),
        )
        target = cur.fetchone()

        if target is None:
            raise RepositoryError(
                code=RepositoryErrorCode.NOT_FOUND,
                message=f"Utente id={utente_id} non trovato",
            )

        if target["ruolo"] == "owner":
            raise RepositoryError(
                code=RepositoryErrorCode.CONSTRAINT_VIOLATION,
                message="Owner non eliminabile (vincolo Spec sez. 11.6)",
            )

        if target["id"] == current_owner.id:
            raise RepositoryError(
                code=RepositoryErrorCode.CONSTRAINT_VIOLATION,
                message="Auto-eliminazione non consentita",
            )

        if not bool(target["attivo"]):
            return {
                "id": utente_id,
                "attivo": False,
                "idempotent_noop": True,
            }

        cur.execute(
            "UPDATE utenti SET attivo = FALSE WHERE id = %s",
            (utente_id,),
        )
        conn.commit()
    finally:
        cur.close()

    return {
        "id": utente_id,
        "attivo": False,
        "idempotent_noop": False,
    }
