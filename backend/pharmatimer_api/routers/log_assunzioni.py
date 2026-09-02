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
from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, Depends, Query, Response, status
from mysql.connector.pooling import PooledMySQLConnection

from pharmatimer_api.db.dependencies import CurrentUser, get_current_user, get_db
from pharmatimer_api.exceptions import RepositoryError, RepositoryErrorCode
from pharmatimer_api.models.log_assunzione import (
    AvvisoIntervalloMinimo,
    LogAssunzioneCreatePresa,
    LogAssunzioneCreateSaltata,
    LogAssunzioneCreateSospesa,
    LogAssunzioneRecuperoPayload,
    LogAssunzioneResponse,
    LogAssunzioneUndoPayload,
    LogAssunzioneVerboResponse,
)
from pharmatimer_api.tempo import minuti_reali, parete

router = APIRouter(prefix="/api", tags=["log_assunzioni"])

_MAX_RANGE_DAYS = 31

# ---------------------------------------------------------------------------
# PAIR INVARIANT ora_ricalcolata / recupero_minuti -- s.6.268, repaired here.
#
# recupero_minuti is the ABSOLUTE total of anticipation baked into
# ora_ricalcolata (s.6.263), so the two columns are ONE value held in two
# cells:
#
#     ora_ricalcolata_stored = ora_ricalcolata_original - recupero_minuti
#
# RULE. Every site that writes recupero_minuti on a row must, in the SAME
# UPDATE, shift ora_ricalcolata by (rec_old - rec_new) minutes. The fragment
# below is textually IDENTICAL at all four restore sites, so one probe finds
# them all and a future site that forgets it stands out by contrast:
#
#     recupero_minuti = %s,
#     ora_ricalcolata = ora_ricalcolata
#     + INTERVAL %s MINUTE - INTERVAL %s MINUTE
#         params (rec_new, rec_old, rec_new)
#
# rec_old is read in the SAME SELECT ... FOR UPDATE and passed as a Python
# parameter, never read inline on the right-hand side: MySQL evaluates UPDATE
# assignments left to right on ALREADY updated values, so an inline read would
# make correctness depend on assignment order. Same reason as post_recupero.
#
# FAIL-SAFE: NULL + INTERVAL is NULL, so a row carrying no recalculated time
# keeps none and PROCEEDS. Suppressing on missing information would be M2.
#
# The D+1 recalculation branch is the DUAL and is NOT part of this fragment:
# it installs a FRESH ora_ricalcolata that carries no anticipation, so it
# writes recupero_minuti = 0 -- SENTINEL_S6268_COPPIA_RICALCOLO.
#
# Before the repair four sites moved the total without moving the time and the
# fifth moved the time without moving the total, so post_recupero rebuilt the
# base from a false total and worked on it in silence: M1 bounded by the floor
# ora_ricalcolata >= TIMESTAMP(data, ora_prevista), M3 up to the whole
# gap_minuti. Measured at par.22.198-quadragies-ter, repaired at
# fix-invariante-coppia. Guarded by backend/tests/test_invariante_coppia.py.
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Decisione 2 -- intervallo minimo LATO SERVER, in minuti REALI.
#
# A presa is ALWAYS registered (M2). If it lands too close to another presa
# of the same farmaco, the 201 carries an `avviso` and the client shows it.
# The nested recalculation is verified: if the recalculated time would fall
# under the minimum interval from the presa just registered, D+1 is NOT
# written and the 201 says `ricalcolo: rifiutato_intervallo_minimo` -- the
# presa stays registered without recalculation, and the client realigns on
# the reread of the window, exactly as it does for the s.6.269 omission.
#
# Why the refusal rides on a 2xx and not on a 4xx (P1=A): any RepositoryError
# raised here rolls the whole transaction back, presa included, and a 4xx
# parks the queued couple on the phone with no retry (Spec 14.3): a presa the
# server DID register would then show up as "Da controllare" -- a false alarm
# on a legitimate gesture.
#
# `intervallo_minimo_ore` NULL means NO guard, neither avviso nor refusal
# (P2=A): absence of information never produces a warning. Spec 3.1 declares
# a 50% default that no site realises, client included; open decision.
#
# The neighbour is the nearest presa of the SAME FARMACO on EITHER side, any
# dose_numero, any date, never the row itself (P3=B). Two doses too close are
# almost always dose 1 and dose 2 of the same farmaco, or the evening and the
# next morning: a comparison limited to the slot would never see them. The
# later side matters for a RETROACTIVE presa, the case where the person's
# memory is least certain and the avviso serves most.
#
# Minutes are REAL (tempo.minuti_reali): 23:00 -> 07:00 across the spring
# transition is 420, not the 480 the wall clock shows.
# ---------------------------------------------------------------------------


def _intervallo_minimo_minuti(cur, farmaco_id: int) -> int | None:
    """Minimum interval of the farmaco in minutes; None when the column is NULL."""
    cur.execute(
        "SELECT intervallo_minimo_ore FROM farmaci WHERE id = %s",
        (farmaco_id,),
    )
    row = cur.fetchone()
    if row is None or row["intervallo_minimo_ore"] is None:
        return None
    # DECIMAL(4,1) arrives as Decimal: one decimal of hours is a whole number
    # of minutes, so int() truncates nothing.
    return int(row["intervallo_minimo_ore"] * 60)


_PRESA_VICINA_SELECT = (
    "SELECT ora_effettiva FROM log_assunzioni "
    "WHERE utente_id = %s AND farmaco_id = %s AND stato = 'presa' "
    "AND ora_effettiva IS NOT NULL AND id <> %s "
)


def _avviso_intervallo_minimo(
    cur,
    utente_id: int,
    farmaco_id: int,
    riga_id: int,
    ora_effettiva: datetime,
    minimo_minuti: int,
) -> AvvisoIntervalloMinimo | None:
    """The nearest presa of the same farmaco on either side, in real minutes.

    Returns the avviso when that distance is under the minimum, else None.
    """
    eff = parete(ora_effettiva)
    cur.execute(
        _PRESA_VICINA_SELECT + "AND ora_effettiva <= %s ORDER BY ora_effettiva DESC LIMIT 1",
        (utente_id, farmaco_id, riga_id, eff),
    )
    prima = cur.fetchone()
    cur.execute(
        _PRESA_VICINA_SELECT + "AND ora_effettiva > %s ORDER BY ora_effettiva ASC LIMIT 1",
        (utente_id, farmaco_id, riga_id, eff),
    )
    dopo = cur.fetchone()

    vicina: tuple[str, datetime, int] | None = None
    if prima is not None:
        vicina = ("precedente", prima["ora_effettiva"], minuti_reali(eff, prima["ora_effettiva"]))
    if dopo is not None:
        distanza = minuti_reali(dopo["ora_effettiva"], eff)
        if vicina is None or distanza < vicina[2]:
            vicina = ("successiva", dopo["ora_effettiva"], distanza)
    if vicina is None or vicina[2] >= minimo_minuti:
        return None
    lato, ora_vicina, minuti = vicina
    return AvvisoIntervalloMinimo(
        lato=lato,
        minuti_dalla_vicina=minuti,
        intervallo_minimo_minuti=minimo_minuti,
        ora_effettiva_vicina=ora_vicina,
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
    response_model=LogAssunzioneVerboResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_presa(
    farmaco_id: int,
    payload: LogAssunzioneCreatePresa,
    response: Response,
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> LogAssunzioneVerboResponse:
    """Register 'presa' state transition atomically with optional ricalcolo dose D+1.

    Uses SELECT FOR UPDATE to lock the row during state-machine branch (CP1.A).
    Decisione 2: `avviso` when the presa is under the minimum interval from
    another presa of the farmaco, `ricalcolo` with the fate of the nested
    recalculation (block at the top of this module).
    """
    cur = conn.cursor(dictionary=True)
    try:
        _verify_farmaco_ownership(cur, farmaco_id, current_user.id)
        if payload.client_op_id is not None:
            cur.execute(
                _LOG_ROW_SELECT_BY_TARGA,
                (payload.client_op_id, current_user.id, farmaco_id),
            )
            dedup_row = cur.fetchone()
            if dedup_row is not None:
                # SENTINEL_D2_AVVISO_DEDUP -- the avviso is DERIVED from stored
                # rows, so a first response lost on the wire does not lose it:
                # recomputed on the replay, same transaction. `ricalcolo` is
                # not stored and stays None on a replay.
                avviso_dedup = None
                minimo_dedup = _intervallo_minimo_minuti(cur, farmaco_id)
                if minimo_dedup is not None and dedup_row["ora_effettiva"] is not None:
                    avviso_dedup = _avviso_intervallo_minimo(
                        cur,
                        current_user.id,
                        farmaco_id,
                        dedup_row["id"],
                        dedup_row["ora_effettiva"],
                        minimo_dedup,
                    )
                conn.commit()
                response.status_code = status.HTTP_200_OK
                return LogAssunzioneVerboResponse(**dedup_row, dedup=True, avviso=avviso_dedup)
        cur.execute(
            "SELECT id, stato, recupero_minuti FROM log_assunzioni "
            "WHERE utente_id = %s AND farmaco_id = %s "
            "AND data = %s AND dose_numero = %s "
            "FOR UPDATE",
            (current_user.id, farmaco_id, payload.data, payload.dose_numero),
        )
        existing = cur.fetchone()
        if existing is not None:
            if existing["stato"] in ("presa", "saltata", "sospesa"):
                raise RepositoryError(
                    code=RepositoryErrorCode.CONFLICT,
                    message=(
                        f"Dose gia in stato '{existing['stato']}', "
                        "transizione a 'presa' non ammessa"
                    ),
                )
            # SENTINEL_S6268_COPPIA_PRESA -- pair rule at the top of this
            # module. Here rec_new comes from the payload instead of being a
            # reset: on the client path the two coincide, because
            # recalc.js buildLogWrite forwards entry.recupero_minuti verbatim,
            # so the shift is a no-op there and a correction wherever the
            # declared total and the stored one disagree.
            rec_old = int(existing["recupero_minuti"] or 0)
            rec_new = payload.recupero_minuti
            cur.execute(
                "UPDATE log_assunzioni SET "
                "ora_prevista = %s, ora_effettiva = %s, delta_minuti = %s, "
                "gap_minuti = %s, stato = 'presa', note = %s, "
                "client_op_id = %s, "
                "recupero_minuti = %s, "
                "ora_ricalcolata = ora_ricalcolata "
                "+ INTERVAL %s MINUTE - INTERVAL %s MINUTE "
                "WHERE id = %s",
                (
                    payload.ora_prevista,
                    payload.ora_effettiva,
                    payload.delta_minuti,
                    payload.gap_minuti,
                    payload.note,
                    payload.client_op_id,
                    rec_new,
                    rec_old,
                    rec_new,
                    existing["id"],
                ),
            )
            target_id = existing["id"]
        else:
            cur.execute(
                "INSERT INTO log_assunzioni ("
                "utente_id, farmaco_id, data, dose_numero, ora_prevista, "
                "ora_effettiva, delta_minuti, gap_minuti, recupero_minuti, stato, note, "
                "client_op_id"
                ") VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'presa', %s, %s)",
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
                    payload.client_op_id,
                ),
            )
            target_id = cur.lastrowid

        # SENTINEL_D2_AVVISO_PRESA -- decisione 2, block at the top of this
        # module. Read AFTER the write of dose D, so the row itself is excluded
        # by id and every other presa of the farmaco is a candidate neighbour.
        minimo_minuti = _intervallo_minimo_minuti(cur, farmaco_id)
        avviso = None
        if minimo_minuti is not None:
            avviso = _avviso_intervallo_minimo(
                cur,
                current_user.id,
                farmaco_id,
                target_id,
                payload.ora_effettiva,
                minimo_minuti,
            )

        ricalc = payload.ricalcolo_dose_successiva
        esito_ricalcolo = None
        if (
            ricalc is not None
            and minimo_minuti is not None
            and minuti_reali(ricalc.ora_ricalcolata, payload.ora_effettiva) < minimo_minuti
        ):
            # SENTINEL_D2_RICALCOLO_RIFIUTATO -- the recalculated time would
            # fall under the minimum interval from the presa just registered:
            # D+1 is NOT written, the presa stays, the 201 names the refusal.
            # Reachable when the client's wall-clock arithmetic crosses a DST
            # transition with a minimum close to the interval, or from a
            # client that computed the time otherwise. The refusal never rolls
            # back dose D (P1=A).
            esito_ricalcolo = "rifiutato_intervallo_minimo"
        elif ricalc is not None:
            cur.execute(
                "SELECT id, stato FROM log_assunzioni "
                "WHERE utente_id = %s AND farmaco_id = %s "
                "AND data = %s AND dose_numero = %s "
                "FOR UPDATE",
                (current_user.id, farmaco_id, ricalc.data, ricalc.dose_numero),
            )
            next_dose = cur.fetchone()
            if next_dose is not None:
                # SENTINEL_S6269_GUARDIA_STATO_DESTINAZIONE -- Q-QBIS-1=A.
                #
                # n3-stato-destinazione: this branch used to overwrite the
                # destination row without ever reading the `stato` it had just
                # selected under FOR UPDATE, so a dose already closed by the
                # user came back as 'ricalcolata' while keeping ora_effettiva.
                # The record then called 'due' a dose that had been taken (M1)
                # and kept the taken time on it (M3). Sites :143, :334 and
                # :431 all refuse a transition from a closed state; this one
                # did not.
                #
                # s.6.269 -- the guard SKIPS the recalculation instead of
                # refusing the whole request. Refusing would roll back dose D
                # written above, and a 4xx parks the queued element with no
                # retry (Spec 14.3): a real intake would never reach the
                # server and would stay invisible until CS-5 (M2). Skipping
                # leaves BOTH rows truthful server-side. Realignment of the
                # client mirror rides on the 2xx refresh; that the refreshed
                # window covers D+1 is NOT measured and is anchored to CS-5.
                if next_dose["stato"] not in ("presa", "saltata", "sospesa"):
                    # SENTINEL_S6268_COPPIA_RICALCOLO -- the DUAL of the
                    # restore rule. A fresh ora_ricalcolata carries no
                    # anticipation, so the stored total goes to zero. Leaving
                    # it stale made a later reset move the dose LATER than the
                    # recalculation instead of restoring it: the one direction
                    # of the defect opposite to every other site.
                    cur.execute(
                        "UPDATE log_assunzioni SET "
                        "ora_ricalcolata = %s, gap_minuti = %s, "
                        "recupero_minuti = 0, stato = 'ricalcolata' "
                        "WHERE id = %s",
                        (
                            ricalc.ora_ricalcolata,
                            ricalc.gap_minuti,
                            next_dose["id"],
                        ),
                    )
                    esito_ricalcolo = "applicato"
                else:
                    # Decisione 2 (P5=A): the s.6.269 omission is NAMED on the
                    # wire instead of staying silent. Action unchanged.
                    esito_ricalcolo = "omesso_stato_destinazione"
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
                esito_ricalcolo = "applicato"

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
    return LogAssunzioneVerboResponse(**row, avviso=avviso, ricalcolo=esito_ricalcolo)


# F3-S3-beta CP1 idempotency_marker v01
# Endpoint transitions state-machine: /saltata, /sospesa, /undo, /recupero.
# All nested under /api/farmaci/{farmaco_id}/log/, coherent with /presa pattern.

_LOG_ROW_SELECT = (
    "SELECT id, utente_id, farmaco_id, data, dose_numero, ora_prevista, "
    "ora_effettiva, delta_minuti, ora_ricalcolata, gap_minuti, "
    "recupero_minuti, stato, note, created_at "
    "FROM log_assunzioni WHERE id = %s"
)



_LOG_ROW_SELECT_BY_TARGA = (
    "SELECT id, utente_id, farmaco_id, data, dose_numero, ora_prevista, "
    "ora_effettiva, delta_minuti, ora_ricalcolata, gap_minuti, "
    "recupero_minuti, stato, note, created_at "
    "FROM log_assunzioni "
    "WHERE client_op_id = %s AND utente_id = %s AND farmaco_id = %s"
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
    response_model=LogAssunzioneVerboResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_saltata(
    farmaco_id: int,
    payload: LogAssunzioneCreateSaltata,
    response: Response,
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
        if payload.client_op_id is not None:
            cur.execute(
                _LOG_ROW_SELECT_BY_TARGA,
                (payload.client_op_id, current_user.id, farmaco_id),
            )
            dedup_row = cur.fetchone()
            if dedup_row is not None:
                conn.commit()
                response.status_code = status.HTTP_200_OK
                return LogAssunzioneVerboResponse(**dedup_row, dedup=True)
        cur.execute(
            "SELECT id, stato, recupero_minuti FROM log_assunzioni "
            "WHERE utente_id = %s AND farmaco_id = %s "
            "AND data = %s AND dose_numero = %s "
            "FOR UPDATE",
            (current_user.id, farmaco_id, payload.data, payload.dose_numero),
        )
        existing = cur.fetchone()
        if existing is not None:
            if existing["stato"] == "saltata":
                raise RepositoryError(
                    code=RepositoryErrorCode.CONFLICT,
                    message="Dose gia in stato 'saltata'",
                )
            if existing["stato"] not in ("prevista", "ricalcolata"):
                raise RepositoryError(
                    code=RepositoryErrorCode.CONFLICT,
                    message=(
                        f"Transizione da '{existing['stato']}' a 'saltata' non ammessa, "
                        "richiede /undo intermedio"
                    ),
                )
            # SENTINEL_S6268_COPPIA_SALTATA -- pair rule at the top of this
            # module. Zeroing the total without giving the time back left the
            # row anticipated by rec_old while the record stated none.
            rec_old = int(existing["recupero_minuti"] or 0)
            rec_new = 0
            cur.execute(
                "UPDATE log_assunzioni SET "
                "stato = 'saltata', "
                "note = COALESCE(%s, note), "
                "ora_effettiva = NULL, delta_minuti = NULL, "
                "client_op_id = %s, "
                "recupero_minuti = %s, "
                "ora_ricalcolata = ora_ricalcolata "
                "+ INTERVAL %s MINUTE - INTERVAL %s MINUTE "
                "WHERE id = %s",
                (
                    payload.note,
                    payload.client_op_id,
                    rec_new,
                    rec_old,
                    rec_new,
                    existing["id"],
                ),
            )
            target_id = existing["id"]
        else:
            cur.execute(
                "INSERT INTO log_assunzioni ("
                "utente_id, farmaco_id, data, dose_numero, ora_prevista, stato, note, "
                "client_op_id"
                ") VALUES (%s, %s, %s, %s, %s, 'saltata', %s, %s)",
                (
                    current_user.id,
                    farmaco_id,
                    payload.data,
                    payload.dose_numero,
                    payload.ora_prevista,
                    payload.note,
                    payload.client_op_id,
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
    response_model=LogAssunzioneVerboResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_sospesa(
    farmaco_id: int,
    payload: LogAssunzioneCreateSospesa,
    response: Response,
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
        if payload.client_op_id is not None:
            cur.execute(
                _LOG_ROW_SELECT_BY_TARGA,
                (payload.client_op_id, current_user.id, farmaco_id),
            )
            dedup_row = cur.fetchone()
            if dedup_row is not None:
                conn.commit()
                response.status_code = status.HTTP_200_OK
                return LogAssunzioneVerboResponse(**dedup_row, dedup=True)
        cur.execute(
            "SELECT id, stato, recupero_minuti FROM log_assunzioni "
            "WHERE utente_id = %s AND farmaco_id = %s "
            "AND data = %s AND dose_numero = %s "
            "FOR UPDATE",
            (current_user.id, farmaco_id, payload.data, payload.dose_numero),
        )
        existing = cur.fetchone()
        if existing is not None:
            if existing["stato"] == "sospesa":
                raise RepositoryError(
                    code=RepositoryErrorCode.CONFLICT,
                    message="Dose gia in stato 'sospesa'",
                )
            if existing["stato"] not in ("prevista", "ricalcolata"):
                raise RepositoryError(
                    code=RepositoryErrorCode.CONFLICT,
                    message=(
                        f"Transizione da '{existing['stato']}' a 'sospesa' non ammessa, "
                        "richiede /undo intermedio"
                    ),
                )
            # SENTINEL_S6268_COPPIA_SOSPESA -- pair rule at the top of this
            # module. Twin of the /saltata site: same UPDATE shape, same
            # failure, and the only one of the five that carried an ISOLATED
            # signal in the suite.
            rec_old = int(existing["recupero_minuti"] or 0)
            rec_new = 0
            cur.execute(
                "UPDATE log_assunzioni SET "
                "stato = 'sospesa', "
                "note = COALESCE(%s, note), "
                "ora_effettiva = NULL, delta_minuti = NULL, "
                "client_op_id = %s, "
                "recupero_minuti = %s, "
                "ora_ricalcolata = ora_ricalcolata "
                "+ INTERVAL %s MINUTE - INTERVAL %s MINUTE "
                "WHERE id = %s",
                (
                    payload.note,
                    payload.client_op_id,
                    rec_new,
                    rec_old,
                    rec_new,
                    existing["id"],
                ),
            )
            target_id = existing["id"]
        else:
            cur.execute(
                "INSERT INTO log_assunzioni ("
                "utente_id, farmaco_id, data, dose_numero, ora_prevista, stato, note, "
                "client_op_id"
                ") VALUES (%s, %s, %s, %s, %s, 'sospesa', %s, %s)",
                (
                    current_user.id,
                    farmaco_id,
                    payload.data,
                    payload.dose_numero,
                    payload.ora_prevista,
                    payload.note,
                    payload.client_op_id,
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
    response_model=LogAssunzioneVerboResponse,
)
def post_undo(
    farmaco_id: int,
    payload: LogAssunzioneUndoPayload,
    response: Response,
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
        if payload.client_op_id is not None:
            cur.execute(
                _LOG_ROW_SELECT_BY_TARGA,
                (payload.client_op_id, current_user.id, farmaco_id),
            )
            dedup_row = cur.fetchone()
            if dedup_row is not None:
                conn.commit()
                response.status_code = status.HTTP_200_OK
                return LogAssunzioneVerboResponse(**dedup_row, dedup=True)
        cur.execute(
            "SELECT id, stato, ora_ricalcolata, recupero_minuti, note "
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
                code=RepositoryErrorCode.CONFLICT,
                message=(
                    f"Nessuna transizione da annullare (stato corrente '{original_stato}')"
                ),
            )

        audit_ts = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
        note_new = _compose_undo_audit_note(existing["note"], audit_ts)
        target_stato = (
            "ricalcolata" if existing["ora_ricalcolata"] is not None else "prevista"
        )
        # SENTINEL_S6268_COPPIA_UNDO -- pair rule at the top of this module.
        # target_stato above is derived from the PRESENCE of ora_ricalcolata,
        # so an undone row goes back to 'ricalcolata' carrying its time: if
        # the total were zeroed without giving that time back, the row would
        # re-enter the recalculated state already anticipated, and the next
        # /recupero would rebuild its base from a false total.
        rec_old = int(existing["recupero_minuti"] or 0)
        rec_new = 0
        cur.execute(
            "UPDATE log_assunzioni SET "
            "stato = %s, "
            "ora_effettiva = NULL, delta_minuti = NULL, "
            "note = %s, "
            "client_op_id = %s, "
            "recupero_minuti = %s, "
            "ora_ricalcolata = ora_ricalcolata "
            "+ INTERVAL %s MINUTE - INTERVAL %s MINUTE "
            "WHERE id = %s",
            (
                target_stato,
                note_new,
                payload.client_op_id,
                rec_new,
                rec_old,
                rec_new,
                existing["id"],
            ),
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
    response_model=LogAssunzioneVerboResponse,
)
def post_recupero(
    farmaco_id: int,
    payload: LogAssunzioneRecuperoPayload,
    response: Response,
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> LogAssunzioneResponse:
    """Reduce ora_ricalcolata by recupero_minuti on a 'ricalcolata' dose.

    Q5 = A (minimal scope): only 1 target dose, no cascade D+1..D+N.
    Q-RES-2 = A constraints:
      - recupero_minuti <= row.gap_minuti
      - resulting ora_ricalcolata >= TIMESTAMP(data, ora_prevista) (no anticipation)
    TODO F3-S3-gamma+: intervallo_minimo_ore enforcement (Q-RES-2 deferred).

    DRIFT-NEW.3 = A: read row.gap_minuti directly (no TIMESTAMPDIFF inline).

    s.6.263: recupero_minuti is an ABSOLUTE total, not a relative decrement.
    Spec 4.3 normed a single application only; on a repeated application the
    literal form of Spec 4.7 shifted ora_ricalcolata again while the column
    kept the last value, so the record understated the real shift (M3). The
    route now rebuilds the original ora_ricalcolata from the stored total,
    then applies the new one. A single application is byte-identical to the
    previous behaviour.

    The old total is read in the SELECT ... FOR UPDATE and passed as a Python
    parameter on purpose: MySQL evaluates UPDATE assignments left to right on
    ALREADY updated values, so reading the column on the right-hand side would
    make correctness depend on assignment order.

    A 'ricalcolata' row with ora_ricalcolata NULL is refused: the anticipation
    post-check compares against NULL, NULL is falsy, and the row would be
    stored with a recupero and no time at all.
    """
    cur = conn.cursor(dictionary=True)
    try:
        _verify_farmaco_ownership(cur, farmaco_id, current_user.id)
        if payload.client_op_id is not None:
            cur.execute(
                _LOG_ROW_SELECT_BY_TARGA,
                (payload.client_op_id, current_user.id, farmaco_id),
            )
            dedup_row = cur.fetchone()
            if dedup_row is not None:
                conn.commit()
                response.status_code = status.HTTP_200_OK
                return LogAssunzioneVerboResponse(**dedup_row, dedup=True)
        cur.execute(
            "SELECT id, stato, ora_prevista, ora_ricalcolata, gap_minuti, "
            "recupero_minuti "
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
                code=RepositoryErrorCode.CONFLICT,
                message=(
                    f"/recupero richiede stato 'ricalcolata' (corrente '{existing['stato']}')"
                ),
            )
        if existing["ora_ricalcolata"] is None:
            raise RepositoryError(
                code=RepositoryErrorCode.CONSTRAINT_VIOLATION,
                message=(
                    "Riga 'ricalcolata' priva di ora_ricalcolata: "
                    "recupero non applicabile"
                ),
            )
        rec_old = int(existing["recupero_minuti"] or 0)
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

        # Apply via INTERVAL MINUTE (ora_ricalcolata is DATETIME, migration v04;
        # cross-midnight safe, unlike time-of-day SUBTIME).
        cur.execute(
            "UPDATE log_assunzioni SET "
            "recupero_minuti = %s, "
            "ora_ricalcolata = ora_ricalcolata "
            "+ INTERVAL %s MINUTE - INTERVAL %s MINUTE, "
            "client_op_id = %s "
            "WHERE id = %s",
            (
                payload.recupero_minuti,
                rec_old,
                payload.recupero_minuti,
                payload.client_op_id,
                existing["id"],
            ),
        )

        # Post-check: ora_ricalcolata >= TIMESTAMP(data, ora_prevista) (no
        # anticipation). Computed SQL-side because ora_ricalcolata is DATETIME
        # but ora_prevista is TIME (Q-A): re-anchor to the row date for a
        # homogeneous comparison (migration v04, Q-C full-datetime).
        cur.execute(
            "SELECT (ora_ricalcolata < TIMESTAMP(data, ora_prevista)) "
            "AS anticipates FROM log_assunzioni WHERE id = %s",
            (existing["id"],),
        )
        check_row = cur.fetchone()
        if check_row["anticipates"]:
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
