"""
PharmaTimer F3-S3alpha CP1
GET + PUT bulk-replace orari_base nested scoped utente+farmaco (F3-S3.A).

GET /api/farmaci/{farmaco_id}/orari -> List[OrarioResponse]
PUT /api/farmaci/{farmaco_id}/orari -> List[OrarioResponse] (full replace atomic, F3-S3.D)

Bulk replace strategy: BEGIN; DELETE WHERE utente+farmaco; INSERT batch; COMMIT.
Atomic transaction ensures all-or-nothing semantics.

Farmaco ownership validation security-by-obscurity (par.22.81 F3-S2.B-bis pattern):
non-existent or other-user-owned both return 404 NOT_FOUND.
"""
from fastapi import APIRouter, Depends
from mysql.connector.pooling import PooledMySQLConnection

from pharmatimer_api.db.dependencies import CurrentUser, get_current_user, get_db
from pharmatimer_api.exceptions import RepositoryError, RepositoryErrorCode
from pharmatimer_api.models.orario import OrariBulkPayload, OrarioResponse


router = APIRouter(prefix="/api", tags=["orari"])


def _verify_farmaco_ownership(cur, farmaco_id: int, utente_id: int) -> None:
    """Verify farmaco belongs to current user AND is active.

    Raises RepositoryError NOT_FOUND when not found OR owned by another user
    OR inactive (security-by-obscurity, no info leak).
    """
    cur.execute(
        "SELECT id FROM farmaci "
        "WHERE id = %s AND utente_id = %s AND attivo = TRUE",
        (farmaco_id, utente_id),
    )
    if cur.fetchone() is None:
        raise RepositoryError(
            code=RepositoryErrorCode.NOT_FOUND,
            message=f"Farmaco {farmaco_id} non trovato",
        )


@router.get(
    "/farmaci/{farmaco_id}/orari",
    response_model=list[OrarioResponse],
)
def list_orari(
    farmaco_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> list[OrarioResponse]:
    """List orari_base for farmaco of authenticated user, ordered dose_numero ASC."""
    cur = conn.cursor(dictionary=True)
    try:
        _verify_farmaco_ownership(cur, farmaco_id, current_user.id)
        cur.execute(
            "SELECT id, utente_id, farmaco_id, dose_numero, offset_minuti, "
            "ancora_riferimento, ora_prevista, descrizione_momento "
            "FROM orari_base "
            "WHERE utente_id = %s AND farmaco_id = %s "
            "ORDER BY dose_numero ASC",
            (current_user.id, farmaco_id),
        )
        rows = cur.fetchall()
    except (RepositoryError, Exception):
        conn.rollback()
        raise
    finally:
        cur.close()
    return [OrarioResponse(**row) for row in rows]


@router.put(
    "/farmaci/{farmaco_id}/orari",
    response_model=list[OrarioResponse],
)
def replace_orari(
    farmaco_id: int,
    payload: OrariBulkPayload,
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> list[OrarioResponse]:
    """Bulk-replace orari for farmaco atomically (F3-S3.D DELETE+INSERT transaction).

    Symmetric with LocalRepository.replaceOrariForFarmaco PWA-side (par.22.34).
    Validates ownership before mutation; empty array clears all orari.
    """
    orari = payload.root
    cur = conn.cursor(dictionary=True)
    try:
        _verify_farmaco_ownership(cur, farmaco_id, current_user.id)
        cur.execute(
            "DELETE FROM orari_base WHERE utente_id = %s AND farmaco_id = %s",
            (current_user.id, farmaco_id),
        )
        if orari:
            cur.executemany(
                "INSERT INTO orari_base ("
                "utente_id, farmaco_id, dose_numero, offset_minuti, "
                "ancora_riferimento, ora_prevista, descrizione_momento"
                ") VALUES (%s, %s, %s, %s, %s, %s, %s)",
                [
                    (
                        current_user.id,
                        farmaco_id,
                        o.dose_numero,
                        o.offset_minuti,
                        o.ancora_riferimento,
                        o.ora_prevista,
                        o.descrizione_momento,
                    )
                    for o in orari
                ],
            )
        cur.execute(
            "SELECT id, utente_id, farmaco_id, dose_numero, offset_minuti, "
            "ancora_riferimento, ora_prevista, descrizione_momento "
            "FROM orari_base "
            "WHERE utente_id = %s AND farmaco_id = %s "
            "ORDER BY dose_numero ASC",
            (current_user.id, farmaco_id),
        )
        rows = cur.fetchall()
        conn.commit()
    except (RepositoryError, Exception):
        conn.rollback()
        raise
    finally:
        cur.close()
    return [OrarioResponse(**row) for row in rows]
