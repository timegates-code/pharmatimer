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
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, status
from mysql.connector.pooling import PooledMySQLConnection

from pharmatimer_api.db.dependencies import CurrentUser, get_current_user, get_db
from pharmatimer_api.exceptions import RepositoryError, RepositoryErrorCode
from pharmatimer_api.models.log_assunzione import (
    LogAssunzioneCreatePresa,
    LogAssunzioneCreateSaltata,
    LogAssunzioneCreateSospesa,
    LogAssunzioneRecuperoPayload,
    LogAssunzioneResponse,
    LogAssunzioneUndoPayload,
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


# F3-S3-beta CP1 idempotency_marker v01
# Endpoint transitions state-machine: /saltata, /sospesa, /undo, /recupero.
# All nested under /api/farmaci/{farmaco_id}/log/, coherent with /presa pattern.

_LOG_ROW_SELECT = (
    "SELECT id, utente_id, farmaco_id, data, dose_numero, ora_prevista, "
    "ora_effettiva, delta_minuti, ora_ricalcolata, gap_minuti, "
    "recupero_minuti, stato, note, created_at "
    "FROM log_assunzioni WHERE id = %s"
)


def _compose_undo_audit_note(existing: str | None, audit_ts_iso: str) -> str:
    """Append `[undo TS]` suffix to note, truncate content if total > 200 chars.

    Sub-Q-DRAFT-1 = A: preserve audit suffix, truncate user content with '...'
    marker. note column is VARCHAR(200) per DDL.
    """
    suffix = f" [undo {audit_ts_iso}]"
    if not existing:
        return suffix.strip()
    full = existing + suffix
    if len(full) <= 200:
        return full
    keep = 200 - len(suffix) - 3
    if keep < 0:
        keep = 0
    return existing[:keep] + "..." + suffix


@router.post(
    "/farmaci/{farmaco_id}/log/saltata",
    response_model=LogAssunzioneResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_saltata(
    farmaco_id: int,
    payload: LogAssunzioneCreateSaltata,
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> LogAssunzioneResponse:
    """Register intentional skip on (data, dose_numero) for farmaco.

    State machine (Q1 matrix):
      no row                       -> INSERT 'saltata'
      'prevista' | 'ricalcolata'   -> UPDATE 'saltata'
      'saltata'                    -> 409 idempotent_block
      'presa' | 'sospesa'          -> 409 invalid_source (lateral via /undo)
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
            if existing["stato"] == "saltata":
                raise RepositoryError(
                    code=RepositoryErrorCode.CONSTRAINT_VIOLATION,
                    message="Dose gia in stato 'saltata'",
                )
            if existing["stato"] not in ("prevista", "ricalcolata"):
                raise RepositoryError(
                    code=RepositoryErrorCode.CONSTRAINT_VIOLATION,
                    message=(
                        f"Transizione da '{existing['stato']}' a 'saltata' non ammessa, "
                        "richiede /undo intermedio"
                    ),
                )
            cur.execute(
                "UPDATE log_assunzioni SET "
                "stato = 'saltata', "
                "note = COALESCE(%s, note), "
                "ora_effettiva = NULL, delta_minuti = NULL, recupero_minuti = 0 "
                "WHERE id = %s",
                (payload.note, existing["id"]),
            )
            target_id = existing["id"]
        else:
            cur.execute(
                "INSERT INTO log_assunzioni ("
                "utente_id, farmaco_id, data, dose_numero, ora_prevista, stato, note"
                ") VALUES (%s, %s, %s, %s, %s, 'saltata', %s)",
                (
                    current_user.id,
                    farmaco_id,
                    payload.data,
                    payload.dose_numero,
                    payload.ora_prevista,
                    payload.note,
                ),
            )
            target_id = cur.lastrowid

        cur.execute(_LOG_ROW_SELECT, (target_id,))
        row = cur.fetchone()
        conn.commit()
    except (RepositoryError, Exception):
        conn.rollback()
        raise
    finally:
        cur.close()
    return LogAssunzioneResponse(**row)


@router.post(
    "/farmaci/{farmaco_id}/log/sospesa",
    response_model=LogAssunzioneResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_sospesa(
    farmaco_id: int,
    payload: LogAssunzioneCreateSospesa,
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> LogAssunzioneResponse:
    """Register intentional suspension on (data, dose_numero).

    Sub-Q-NEW.2 = A: 'sospesa' is a pre-administration intentional decision.
    From 'presa' the user must /undo then /sospesa (no direct lateral).

    State machine:
      no row                       -> INSERT 'sospesa'
      'prevista' | 'ricalcolata'   -> UPDATE 'sospesa'
      'sospesa'                    -> 409 idempotent_block
      'presa' | 'saltata'          -> 409 invalid_source
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
            if existing["stato"] == "sospesa":
                raise RepositoryError(
                    code=RepositoryErrorCode.CONSTRAINT_VIOLATION,
                    message="Dose gia in stato 'sospesa'",
                )
            if existing["stato"] not in ("prevista", "ricalcolata"):
                raise RepositoryError(
                    code=RepositoryErrorCode.CONSTRAINT_VIOLATION,
                    message=(
                        f"Transizione da '{existing['stato']}' a 'sospesa' non ammessa, "
                        "richiede /undo intermedio"
                    ),
                )
            cur.execute(
                "UPDATE log_assunzioni SET "
                "stato = 'sospesa', "
                "note = COALESCE(%s, note), "
                "ora_effettiva = NULL, delta_minuti = NULL, recupero_minuti = 0 "
                "WHERE id = %s",
                (payload.note, existing["id"]),
            )
            target_id = existing["id"]
        else:
            cur.execute(
                "INSERT INTO log_assunzioni ("
                "utente_id, farmaco_id, data, dose_numero, ora_prevista, stato, note"
                ") VALUES (%s, %s, %s, %s, %s, 'sospesa', %s)",
                (
                    current_user.id,
                    farmaco_id,
                    payload.data,
                    payload.dose_numero,
                    payload.ora_prevista,
                    payload.note,
                ),
            )
            target_id = cur.lastrowid

        cur.execute(_LOG_ROW_SELECT, (target_id,))
        row = cur.fetchone()
        conn.commit()
    except (RepositoryError, Exception):
        conn.rollback()
        raise
    finally:
        cur.close()
    return LogAssunzioneResponse(**row)


@router.post(
    "/farmaci/{farmaco_id}/log/undo",
    response_model=LogAssunzioneResponse,
)
def post_undo(
    farmaco_id: int,
    payload: LogAssunzioneUndoPayload,
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> LogAssunzioneResponse:
    """Rollback last transition in-place.

    Q3 = A: rollback in-place + audit `note` append (no DELETE row, no new
    ENUM state). Target state derived from ora_ricalcolata presence:
      ora_ricalcolata IS NOT NULL  -> 'ricalcolata'
      otherwise                    -> 'prevista'

    Q1 matrix side effect: if original was 'presa' and farmaco.tipo_frequenza
    == 'intervallo', also rolls back D+1 row from 'ricalcolata' back to
    'prevista' (computed via dose_numero+1 wrapping on dosi_giornaliere).

    409 nothing_to_undo for current state in ('prevista', 'ricalcolata').
    """
    cur = conn.cursor(dictionary=True)
    try:
        _verify_farmaco_ownership(cur, farmaco_id, current_user.id)
        cur.execute(
            "SELECT id, stato, ora_ricalcolata, note "
            "FROM log_assunzioni "
            "WHERE utente_id = %s AND farmaco_id = %s "
            "AND data = %s AND dose_numero = %s "
            "FOR UPDATE",
            (current_user.id, farmaco_id, payload.data, payload.dose_numero),
        )
        existing = cur.fetchone()
        if existing is None:
            raise RepositoryError(
                code=RepositoryErrorCode.NOT_FOUND,
                message="Riga log_assunzioni non trovata per lo slot indicato",
            )
        original_stato = existing["stato"]
        if original_stato in ("prevista", "ricalcolata"):
            raise RepositoryError(
                code=RepositoryErrorCode.CONSTRAINT_VIOLATION,
                message=(
                    f"Nessuna transizione da annullare (stato corrente '{original_stato}')"
                ),
            )

        audit_ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        note_new = _compose_undo_audit_note(existing["note"], audit_ts)
        target_stato = (
            "ricalcolata" if existing["ora_ricalcolata"] is not None else "prevista"
        )
        cur.execute(
            "UPDATE log_assunzioni SET "
            "stato = %s, "
            "ora_effettiva = NULL, delta_minuti = NULL, recupero_minuti = 0, "
            "note = %s "
            "WHERE id = %s",
            (target_stato, note_new, existing["id"]),
        )

        # Rollback D+1 only if undoing 'presa' on an interval-frequency drug.
        if original_stato == "presa":
            cur.execute(
                "SELECT tipo_frequenza, dosi_giornaliere FROM farmaci WHERE id = %s",
                (farmaco_id,),
            )
            farmaco_row = cur.fetchone()
            if farmaco_row and farmaco_row["tipo_frequenza"] == "intervallo":
                dosi_max = int(farmaco_row["dosi_giornaliere"] or 1)
                next_dose = payload.dose_numero + 1
                next_data = payload.data
                if next_dose > dosi_max:
                    next_data = payload.data + timedelta(days=1)
                    next_dose = 1
                cur.execute(
                    "SELECT id, stato FROM log_assunzioni "
                    "WHERE utente_id = %s AND farmaco_id = %s "
                    "AND data = %s AND dose_numero = %s "
                    "FOR UPDATE",
                    (current_user.id, farmaco_id, next_data, next_dose),
                )
                d_plus_one = cur.fetchone()
                if d_plus_one is not None and d_plus_one["stato"] == "ricalcolata":
                    cur.execute(
                        "UPDATE log_assunzioni SET "
                        "stato = 'prevista', ora_ricalcolata = NULL, "
                        "gap_minuti = 0, recupero_minuti = 0, delta_minuti = NULL "
                        "WHERE id = %s",
                        (d_plus_one["id"],),
                    )

        cur.execute(_LOG_ROW_SELECT, (existing["id"],))
        row = cur.fetchone()
        conn.commit()
    except (RepositoryError, Exception):
        conn.rollback()
        raise
    finally:
        cur.close()
    return LogAssunzioneResponse(**row)


@router.post(
    "/farmaci/{farmaco_id}/log/recupero",
    response_model=LogAssunzioneResponse,
)
def post_recupero(
    farmaco_id: int,
    payload: LogAssunzioneRecuperoPayload,
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> LogAssunzioneResponse:
    """Reduce ora_ricalcolata by recupero_minuti on a 'ricalcolata' dose.

    Q5 = A (minimal scope): only 1 target dose, no cascade D+1..D+N.
    Q-RES-2 = A constraints:
      - recupero_minuti <= row.gap_minuti
      - resulting ora_ricalcolata >= ora_prevista (no anticipation)
    TODO F3-S3-gamma+: intervallo_minimo_ore enforcement (Q-RES-2 deferred).

    DRIFT-NEW.3 = A: read row.gap_minuti directly (no TIMESTAMPDIFF inline).
    """
    cur = conn.cursor(dictionary=True)
    try:
        _verify_farmaco_ownership(cur, farmaco_id, current_user.id)
        cur.execute(
            "SELECT id, stato, ora_prevista, ora_ricalcolata, gap_minuti "
            "FROM log_assunzioni "
            "WHERE utente_id = %s AND farmaco_id = %s "
            "AND data = %s AND dose_numero = %s "
            "FOR UPDATE",
            (current_user.id, farmaco_id, payload.data, payload.dose_numero),
        )
        existing = cur.fetchone()
        if existing is None:
            raise RepositoryError(
                code=RepositoryErrorCode.NOT_FOUND,
                message="Riga log_assunzioni non trovata per lo slot indicato",
            )
        if existing["stato"] != "ricalcolata":
            raise RepositoryError(
                code=RepositoryErrorCode.CONSTRAINT_VIOLATION,
                message=(
                    f"/recupero richiede stato 'ricalcolata' (corrente '{existing['stato']}')"
                ),
            )
        gap_min = int(existing["gap_minuti"] or 0)
        if gap_min <= 0:
            raise RepositoryError(
                code=RepositoryErrorCode.CONSTRAINT_VIOLATION,
                message="Nessun gap da recuperare su questa dose",
            )
        if payload.recupero_minuti > gap_min:
            raise RepositoryError(
                code=RepositoryErrorCode.CONSTRAINT_VIOLATION,
                message=(
                    f"recupero_minuti ({payload.recupero_minuti}) eccede gap "
                    f"accumulato ({gap_min})"
                ),
            )

        # Apply via SUBTIME (DDL stores ora_ricalcolata as TIME).
        cur.execute(
            "UPDATE log_assunzioni SET "
            "recupero_minuti = %s, "
            "ora_ricalcolata = SUBTIME(ora_ricalcolata, SEC_TO_TIME(%s * 60)) "
            "WHERE id = %s",
            (payload.recupero_minuti, payload.recupero_minuti, existing["id"]),
        )

        # Post-check: nuova ora_ricalcolata >= ora_prevista (no anticipation).
        cur.execute(
            "SELECT ora_prevista, ora_ricalcolata FROM log_assunzioni WHERE id = %s",
            (existing["id"],),
        )
        check_row = cur.fetchone()
        if check_row["ora_ricalcolata"] < check_row["ora_prevista"]:
            raise RepositoryError(
                code=RepositoryErrorCode.CONSTRAINT_VIOLATION,
                message="Recupero anticipa oltre l'orario base previsto",
            )

        cur.execute(_LOG_ROW_SELECT, (existing["id"],))
        row = cur.fetchone()
        conn.commit()
    except (RepositoryError, Exception):
        conn.rollback()
        raise
    finally:
        cur.close()
    return LogAssunzioneResponse(**row)
