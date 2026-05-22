"""
PharmaTimer F3-S3alpha CP2-fix
Pydantic models for orari_base resource (8 columns DDL).

OrarioBase: shared writable fields (DRY).
OrarioCreate: single bulk-replace item payload (utente/farmaco injected server-side).
OrariBulkPayload: RootModel[list[OrarioCreate]] with cross-item validator (CP1.D + CP1.E).
OrarioResponse: GET response, all 8 columns.

ENUM ancora_riferimento: 6 values DDL aligned with Spec sez. 3.5.

CP2-fix (drift-N39): mysql-connector-python returns MySQL TIME as datetime.timedelta;
field_validator(mode='before') coerces to datetime.time. String/time input from
JSON pass through to Pydantic native parser.
"""
from datetime import time, timedelta
from typing import Literal, Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    RootModel,
    field_validator,
    model_validator,
)


AncoraRiferimento = Literal[
    "sveglia", "colazione", "pranzo", "cena", "sonno", "assoluto"
]


def _coerce_timedelta_to_time(v):
    """Convert mysql-connector timedelta -> datetime.time (drift-N39).

    Pass-through for str, datetime.time, None and other inputs: Pydantic handles
    the rest natively. Assumes timedelta in 00:00:00-23:59:59 range (positive,
    sub-day): MySQL TIME column constraint at PWA-side.
    """
    if isinstance(v, timedelta):
        total = int(v.total_seconds())
        return time(
            hour=total // 3600,
            minute=(total % 3600) // 60,
            second=total % 60,
        )
    return v


class OrarioBase(BaseModel):
    """Shared writable fields. Excludes server-managed id/utente_id/farmaco_id."""

    dose_numero: int = Field(..., ge=1)
    offset_minuti: int
    ancora_riferimento: AncoraRiferimento
    ora_prevista: time
    descrizione_momento: Optional[str] = Field(default=None, max_length=100)

    _coerce_ora_prevista = field_validator("ora_prevista", mode="before")(
        _coerce_timedelta_to_time
    )


class OrarioCreate(OrarioBase):
    """Single orario item for bulk-replace PUT payload.

    utente_id and farmaco_id are injected server-side from path/token (F3-S3.D).
    """


class OrarioResponse(OrarioBase):
    """GET response payload. All 8 columns from orari_base."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    utente_id: int
    farmaco_id: int


class OrariBulkPayload(RootModel[list[OrarioCreate]]):
    """PUT bulk-replace body: pure JSON array of OrarioCreate items (CP1.D).

    Validates dose_numero univocity + sequentiality cross-item (CP1.E).
    Empty array is allowed (clears all orari for the farmaco).
    """

    @model_validator(mode="after")
    def _validate_bulk(self) -> "OrariBulkPayload":
        orari = self.root
        if not orari:
            return self
        dose_numbers = [o.dose_numero for o in orari]
        seen = set()
        for dn in dose_numbers:
            if dn in seen:
                raise ValueError(
                    f"dose_numero duplicato: {dn} (deve essere univoco per farmaco)"
                )
            seen.add(dn)
        sorted_dn = sorted(dose_numbers)
        expected = list(range(1, len(sorted_dn) + 1))
        if sorted_dn != expected:
            raise ValueError(
                f"dose_numero deve essere sequenziale 1..N, ricevuto {sorted_dn}"
            )
        return self
