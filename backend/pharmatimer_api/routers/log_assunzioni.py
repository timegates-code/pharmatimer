"""
PharmaTimer F3-S3alpha CP1
GET + POST /presa log_assunzioni nested scoped utente+farmaco (F3-S3.B).

GET /api/farmaci/{farmaco_id}/log?data_from=&data_to= -> List[LogAssunzioneResponse]
POST /api/farmaci/{farmaco_id}/log/presa -> LogAssunzioneResponse (201 Created)

POST /presa state machine (CP1.A):
- row in stato 'prevista' or 'ricalcolata' -> UPDATE to 'presa'
- row in stato 'presa', 'saltata', 'sospesa' -> 409 CONSTRAINT_VIOLATION
- no row -> INSERT new 'presa'

Optional ricalcolo_dose_successiva (CP1.C): atomic UPSERT dose D+1 'ricalcolata'.

Scope F3-S3alpha: only /presa command. /saltata, /sospesa, /undo, /recupero
deferred F3-S3beta (par.11.D-S3 F3-S3.F split ratified).
"""
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from mysql.connector.pooling import PooledMySQLConnection

from pharmatimer_api.db.dependencies import CurrentUser, get_current_user, get_db
from pharmatimer_api.exceptions import RepositoryError, RepositoryErrorCode
from pharmatimer_api.models.log_assunzione import (
    LogAssunzioneCreatePresa,
    LogAssunzioneResponse,
)


router = APIRouter(prefix="/api", tags=["log_assunzioni"])

_MAX_RANGE_DAYS = 31


def _verify_farmaco_ownership(cur, farmaco_id: int, utente_id: int) -> None:
    """Duplicated locally to avoid cross-router import coupling.

    Raises RepositoryError NOT_FOUND on miss/other-user/inactive (security-by-obscurity).
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
    "/farmaci/{farmaco_id}/log",
    response_model=list[LogAssunzioneResponse],
)
def list_log_assunzioni(
    farmaco_id: int,
    data_from: date = Query(..., description="Data inizio inclusa ISO YYYY-MM-DD"),
    data_to: date = Query(..., description="Data fine inclusa ISO YYYY-MM-DD"),
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> list[LogAssunzioneResponse]:
    """List log_assunzioni in date range, ordered data+dose_numero ASC.

    CP1.B: data_from + data_to MANDATORY, range max 31 giorni anti-unbound.
    """
    if data_to < data_from:
        raise RepositoryError(
            code=RepositoryErrorCode.CONSTRAINT_VIOLATION,
            message="data_to deve essere >= data_from",
        )
    if (data_to - data_from).days > _MAX_RANGE_DAYS:
        raise RepositoryError(
            code=RepositoryErrorCode.CONSTRAINT_VIOLATION,
            message=f"Range massimo {_MAX_RANGE_DAYS} giorni",
        )
    cur = conn.cursor(dictionary=True)
    try:
        _verify_farmaco_ownership(cur, farmaco_id, current_user.id)
        cur.execute(
            "SELECT id, utente_id, farmaco_id, data, dose_numero, ora_prevista, "
            "ora_effettiva, delta_minuti, ora_ricalcolata, gap_minuti, "
            "recupero_minuti, stato, note, created_at "
            "FROM log_assunzioni "
            "WHERE utente_id = %s AND farmaco_id = %s "
            "AND data BETWEEN %s AND %s "
            "ORDER BY data ASC, dose_numero ASC",
            (current_user.id, farmaco_id, data_from, data_to),
        )
        rows = cur.fetchall()
    except (RepositoryError, Exception):
        conn.rollback()
        raise
    finally:
        cur.close()
    return [LogAssunzioneResponse(**row) for row in rows]


@router.post(
    "/farmaci/{farmaco_id}/log/presa",
    response_model=LogAssunzioneResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_presa(
    farmaco_id: int,
    payload: LogAssunzioneCreatePresa,
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> LogAssunzioneResponse:
    """Register 'presa' state transition atomically with optional ricalcolo dose D+1.

    Uses SELECT FOR UPDATE to lock the row during state-machine branch (CP1.A).
    """
    cur = conn.cursor(dictionary=True)
    try:
        _verify_farmaco_ownership(cur, farmaco_id, current_user.id)
        cur.execute(
            "SELECT id, stato FROM log_assunzioni "
            "WHERE utente_id = %s AND farmaco_id = %s "
            "AND data = %s AND dose_numero = %s "
            "FOR UPDATE",
            (current_user.id, farmaco_id, payload.data, payload.dose_numero),
        )
        existing = cur.fetchone()
        if existing is not None:
            if existing["stato"] in ("presa", "saltata", "sospesa"):
                raise RepositoryError(
                    code=RepositoryErrorCode.CONSTRAINT_VIOLATION,
                    message=(
                        f"Dose gia in stato '{existing['stato']}', "
                        "transizione a 'presa' non ammessa"
                    ),
                )
            cur.execute(
                "UPDATE log_assunzioni SET "
                "ora_prevista = %s, ora_effettiva = %s, delta_minuti = %s, "
                "gap_minuti = %s, recupero_minuti = %s, stato = 'presa', note = %s "
                "WHERE id = %s",
                (
                    payload.ora_prevista,
                    payload.ora_effettiva,
                    payload.delta_minuti,
                    payload.gap_minuti,
                    payload.recupero_minuti,
                    payload.note,
                    existing["id"],
                ),
            )
            target_id = existing["id"]
        else:
            cur.execute(
                "INSERT INTO log_assunzioni ("
                "utente_id, farmaco_id, data, dose_numero, ora_prevista, "
                "ora_effettiva, delta_minuti, gap_minuti, recupero_minuti, stato, note"
                ") VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'presa', %s)",
                (
                    current_user.id,
                    farmaco_id,
                    payload.data,
                    payload.dose_numero,
                    payload.ora_prevista,
                    payload.ora_effettiva,
                    payload.delta_minuti,
                    payload.gap_minuti,
                    payload.recupero_minuti,
                    payload.note,
                ),
            )
            target_id = cur.lastrowid

        ricalc = payload.ricalcolo_dose_successiva
        if ricalc is not None:
            cur.execute(
                "SELECT id, stato FROM log_assunzioni "
                "WHERE utente_id = %s AND farmaco_id = %s "
                "AND data = %s AND dose_numero = %s "
                "FOR UPDATE",
                (current_user.id, farmaco_id, ricalc.data, ricalc.dose_numero),
            )
            next_dose = cur.fetchone()
            if next_dose is not None:
                cur.execute(
                    "UPDATE log_assunzioni SET "
                    "ora_ricalcolata = %s, gap_minuti = %s, stato = 'ricalcolata' "
                    "WHERE id = %s",
                    (
                        ricalc.ora_ricalcolata,
                        ricalc.gap_minuti,
                        next_dose["id"],
                    ),
                )
            else:
                cur.execute(
                    "INSERT INTO log_assunzioni ("
                    "utente_id, farmaco_id, data, dose_numero, ora_prevista, "
                    "ora_ricalcolata, gap_minuti, stato"
                    ") VALUES (%s, %s, %s, %s, %s, %s, %s, 'ricalcolata')",
                    (
                        current_user.id,
                        farmaco_id,
                        ricalc.data,
                        ricalc.dose_numero,
                        ricalc.ora_prevista,
                        ricalc.ora_ricalcolata,
                        ricalc.gap_minuti,
                    ),
                )

        cur.execute(
            "SELECT id, utente_id, farmaco_id, data, dose_numero, ora_prevista, "
            "ora_effettiva, delta_minuti, ora_ricalcolata, gap_minuti, "
            "recupero_minuti, stato, note, created_at "
            "FROM log_assunzioni WHERE id = %s",
            (target_id,),
        )
        row = cur.fetchone()
        conn.commit()
    except (RepositoryError, Exception):
        conn.rollback()
        raise
    finally:
        cur.close()
    return LogAssunzioneResponse(**row)
