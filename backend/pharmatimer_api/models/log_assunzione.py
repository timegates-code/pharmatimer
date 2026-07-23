"""
PharmaTimer F3-S3alpha CP2-fix
Pydantic models for log_assunzioni resource (14 columns DDL).

LogAssunzioneCreatePresa: POST /api/farmaci/{id}/log/presa payload.
RicalcoloDoseSuccessivaPayload: optional nested batch dose D+1 (CP1.C).
LogAssunzioneResponse: GET response, all 14 columns.

ENUM stato: 5 values DDL aligned Spec sez. 3.6.

CP2-fix (drift-N39): mysql-connector-python returns MySQL TIME columns as
datetime.timedelta; field_validator(mode='before') coerces ora_prevista to
datetime.time on Response model only (Create models receive ISO string from
JSON and use Pydantic native parser). ora_ricalcolata is now DATETIME (migration
v04) and is parsed natively by Pydantic (no timedelta coercion needed).
"""
from datetime import date, datetime, time, timedelta
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


StatoAssunzione = Literal[
    "prevista", "presa", "saltata", "sospesa", "ricalcolata"
]


def _coerce_timedelta_to_time(v):
    """Convert mysql-connector timedelta -> datetime.time (drift-N39).

    Pass-through for str, datetime.time, None and other inputs.
    """
    if isinstance(v, timedelta):
        total = int(v.total_seconds())
        return time(
            hour=total // 3600,
            minute=(total % 3600) // 60,
            second=total % 60,
        )
    return v


class RicalcoloDoseSuccessivaPayload(BaseModel):
    """Optional nested payload for batch upsert dose D+1 in same /presa transaction.

    PWA provides both ora_prevista (original, NOT NULL DDL) and ora_ricalcolata
    (PWA-computed new datetime after gap-aware recalc per F3-S3.C; full ISO
    datetime per migration v04, cross-midnight safe). Backend persists
    'ricalcolata' state atomically with /presa (CP1.C).
    """

    dose_numero: int = Field(..., ge=1)
    data: date
    ora_prevista: time
    ora_ricalcolata: datetime
    gap_minuti: int


class LogAssunzioneCreatePresa(BaseModel):
    """POST /api/farmaci/{id}/log/presa payload (F3-S3.B command-based).

    Target dose identified by (data, dose_numero). utente_id + farmaco_id
    injected server-side. State machine (CP1.A):
    - 'prevista' or 'ricalcolata' -> 'presa' (allowed)
    - 'presa', 'saltata', 'sospesa' -> 409 CONSTRAINT_VIOLATION
    - no row -> INSERT new 'presa'
    """

    data: date
    dose_numero: int = Field(..., ge=1)
    ora_prevista: time
    ora_effettiva: datetime
    delta_minuti: int
    gap_minuti: int = 0
    recupero_minuti: int = 0
    note: Optional[str] = Field(default=None, max_length=200)
    ricalcolo_dose_successiva: Optional[RicalcoloDoseSuccessivaPayload] = None
    client_op_id: Optional[str] = Field(default=None, max_length=36)


class LogAssunzioneResponse(BaseModel):
    """GET response payload. All 14 columns from log_assunzioni."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    utente_id: int
    farmaco_id: int
    data: date
    dose_numero: int
    ora_prevista: time
    ora_effettiva: Optional[datetime] = None
    delta_minuti: Optional[int] = None
    ora_ricalcolata: Optional[datetime] = None
    gap_minuti: int
    recupero_minuti: int
    stato: StatoAssunzione
    note: Optional[str] = None
    created_at: datetime

    _coerce_ora_prevista = field_validator("ora_prevista", mode="before")(
        _coerce_timedelta_to_time
    )


class LogAssunzioneVerboResponse(LogAssunzioneResponse):
    """Verb-endpoint response = full row + dedup flag (Spec sez. 14.6).

    dedup=True only on a first-gesture dedupe hit (client_op_id already applied
    to this row): the row is returned unchanged, the transition NOT re-applied.
    dedup=False on the normal path. GET list stays on LogAssunzioneResponse.
    """

    dedup: bool = False


# F3-S3-beta CP1 idempotency_marker v01
# 5 NEW Pydantic models for state transitions endpoints under
# /api/farmaci/{farmaco_id}/log/{saltata|sospesa|undo|recupero}.
# farmaco_id comes from path (NOT payload), utente_id from Depends auth.

class LogAssunzioneSlotPayload(BaseModel):
    """Slot identifier: target dose (data, dose_numero) scoped utente+farmaco."""

    data: date
    dose_numero: int = Field(..., ge=1)
    client_op_id: Optional[str] = Field(default=None, max_length=36)


class LogAssunzioneCreateSaltata(LogAssunzioneSlotPayload):
    """POST /saltata payload. ora_prevista is NOT NULL in DDL."""

    ora_prevista: time
    note: Optional[str] = Field(default=None, max_length=200)


class LogAssunzioneCreateSospesa(LogAssunzioneSlotPayload):
    """POST /sospesa payload.

    Sub-Q-NEW.2 = A: source state 'presa' is rejected at router level (409),
    transitions allowed only from 'prevista' or 'ricalcolata'. To suspend a
    dose already taken, the user must /undo first then /sospesa.
    """

    ora_prevista: time
    note: Optional[str] = Field(default=None, max_length=200)


class LogAssunzioneUndoPayload(LogAssunzioneSlotPayload):
    """POST /undo payload. Audit suffix is server-generated, no client field."""

    pass


class LogAssunzioneRecuperoPayload(LogAssunzioneSlotPayload):
    """POST /recupero payload.

    Q-RES-2 = A (minimal): recupero_minuti must be <= row.gap_minuti and the
    resulting ora_ricalcolata must remain >= ora_prevista (no anticipation
    beyond base time). intervallo_minimo_ore constraint DEFERRED F3-S3-gamma+.
    """

    # SENTINEL_S6264_GE0
    # s.6.264 (Q-H=A). Under the ABSOLUTE semantics of s.6.263 the natural
    # domain of the total is 0..gap, and ZERO is a real clinical gesture,
    # not a no-op: RESET, i.e. ora_ricalcolata restored to the originally
    # recalculated time. MEASURED at quinquetriginties: this route already
    # handles zero correctly by construction (rec_old restored, INTERVAL 0
    # MINUTE, anticipation post-check unchanged) -- validation was the only
    # obstacle. A true total of zero must be expressible, because the
    # one-minute workaround falsifies the record by one minute (M3).
    # The client guard moves to presence-and-type in the SAME commit:
    # relaxing one side alone was ratified as clinically UNSAFE.
    recupero_minuti: int = Field(..., ge=0, le=1440)
