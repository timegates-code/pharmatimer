"""
PharmaTimer F3-S3alpha CP2-fix
Pydantic models for orari_base resource (9 columns DDL).

OrarioBase: shared writable fields (DRY).
OrarioCreate: single bulk-replace item payload (utente/farmaco injected server-side).
OrariBulkPayload: RootModel[list[OrarioCreate]] with cross-item validator (CP1.D + CP1.E).
OrarioResponse: GET response, all 8 columns.

ENUM ancora_riferimento: 6 values DDL aligned with Spec sez. 3.5.

CP2-fix (drift-N39): mysql-connector-python returns MySQL TIME as datetime.timedelta;
field_validator(mode='before') coerces to datetime.time. String/time input from
JSON pass through to Pydantic native parser.
"""
from datetime import date, time, timedelta
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
    data_specifica: Optional[date] = None

    _coerce_ora_prevista = field_validator("ora_prevista", mode="before")(
        _coerce_timedelta_to_time
    )


class OrarioCreate(OrarioBase):
    """Single orario item for bulk-replace PUT payload.

    utente_id and farmaco_id are injected server-side from path/token (F3-S3.D).
    """


class OrarioResponse(OrarioBase):
    """GET response payload. All 9 columns from orari_base."""

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
        """Cross-item validation (par.22.148 F14 Blocco 2).

        data_specifica drives the branch (farmaco is mono-tipo, Q-F):
        - all-NULL  -> recurring rows: global univocity + sequentiality 1..N (legacy).
        - all-valued-> fisso_date occurrences (Pattern S): anchor 'assoluto' (Q-H),
          <=30 distinct dates (Q-G), per-date dose_numero 1..M with constant M.
        - mixed     -> rejected.
        Time equality across dates is NOT enforced here (Q-I=form responsibility).
        """
        orari = self.root
        if not orari:
            return self
        valued = [o for o in orari if o.data_specifica is not None]
        null_rows = [o for o in orari if o.data_specifica is None]
        # Q-F: mixed population rejected.
        if valued and null_rows:
            raise ValueError(
                "data_specifica deve essere valorizzata su tutte le righe "
                "o su nessuna (farmaco mono-tipo)"
            )

        if not valued:
            # All-NULL: recurring rows. Global univocity + sequentiality 1..N.
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

        # All-valued: fisso_date occurrences (Pattern S).
        # Q-H: anchor MUST be 'assoluto' on every valued row.
        for o in valued:
            if o.ancora_riferimento != "assoluto":
                raise ValueError(
                    "ancora_riferimento deve essere 'assoluto' per righe "
                    "con data_specifica"
                )
        # Q-G: at most 30 distinct dates.
        distinct_dates = {o.data_specifica for o in valued}
        if len(distinct_dates) > 30:
            raise ValueError(
                f"numero massimo di date superato: {len(distinct_dates)} (max 30)"
            )
        # Per-date dose_numero sequentiality 1..M with constant M across dates.
        by_date: dict = {}
        for o in valued:
            by_date.setdefault(o.data_specifica, []).append(o.dose_numero)
        expected_m = None
        for d, dns in by_date.items():
            m = len(dns)
            if expected_m is None:
                expected_m = m
            elif m != expected_m:
                raise ValueError(
                    "numero di dosi per data non costante (Pattern S): "
                    f"atteso {expected_m}, trovato {m} per la data {d}"
                )
            if sorted(dns) != list(range(1, m + 1)):
                raise ValueError(
                    f"dose_numero deve essere sequenziale 1..M per la data {d}, "
                    f"ricevuto {sorted(dns)}"
                )
        return self
