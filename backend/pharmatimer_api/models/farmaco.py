"""
PharmaTimer F3-S1-bis-delta CP3
Pydantic models for farmaci resource.

FarmacoBase: shared writable fields (DRY).
FarmacoCreate: POST payload (deferred F3-S2 CRUD).
FarmacoResponse: GET response, all 18 columns (Q3=a par.11.D-S1.bis-cont-2)
                 for drop-in ApiRepository symmetry with LocalRepository.
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

TipoFrequenza = Literal["intervallo", "fisso", "fisso_date"]
RelazionePasto = Literal[
    "prima", "durante", "dopo", "stomaco_pieno", "lontano", "indifferente"
]


class FarmacoBase(BaseModel):
    """Shared writable fields. Excludes id/utente_id/timestamps (server-managed)."""

    nome: str = Field(..., min_length=1, max_length=100)
    principio_attivo: str | None = Field(default=None, max_length=100)
    funzione: str | None = Field(default=None, max_length=200)
    tipo_frequenza: TipoFrequenza
    intervallo_ore: Decimal | None = None
    intervallo_minimo_ore: Decimal | None = None
    dosi_giornaliere: int = Field(..., ge=1)
    relazione_pasto: RelazionePasto
    dettaglio_pasto: str | None = Field(default=None, max_length=100)
    note: str | None = None
    data_inizio: date
    data_fine: date | None = None
    attivo: bool = True
    demo: bool = False

    @model_validator(mode="after")
    def _validate_frequenza_consistency(self) -> "FarmacoBase":
        """Enforce tipo_frequenza vs intervallo_ore/intervallo_minimo_ore (F3-S2 CP1).

        Rules (DDL v05_fisso_date.sql + Spec sez. 3.1 + F14 Blocco 2 par.22.148):
        - tipo_frequenza='fisso' OR 'fisso_date': intervallo_ore AND
          intervallo_minimo_ore MUST be None.
        - tipo_frequenza='intervallo': intervallo_ore MUST be set AND > 0.
        - dosi_giornaliere is always required (DDL NOT NULL); ge=1 enforced in Field().
        """
        if self.tipo_frequenza in ("fisso", "fisso_date"):
            if self.intervallo_ore is not None:
                raise ValueError(
                    "intervallo_ore deve essere NULL per "
                    "tipo_frequenza=fisso/fisso_date"
                )
            if self.intervallo_minimo_ore is not None:
                raise ValueError(
                    "intervallo_minimo_ore deve essere NULL per "
                    "tipo_frequenza=fisso/fisso_date"
                )
        else:
            if self.intervallo_ore is None or self.intervallo_ore <= 0:
                raise ValueError(
                    "intervallo_ore obbligatorio (>0) per tipo_frequenza=intervallo"
                )
        return self

    @model_validator(mode="after")
    def _validate_data_range(self) -> "FarmacoBase":
        """Enforce data_fine >= data_inizio when data_fine is not None (F3-S2 CP1)."""
        if self.data_fine is not None and self.data_fine < self.data_inizio:
            raise ValueError("data_fine deve essere >= data_inizio")
        return self


class FarmacoCreate(FarmacoBase):
    """POST payload. utente_id injected server-side from token.

    Inherits validators from FarmacoBase (F3-S2 CP1).
    """


class FarmacoUpdate(FarmacoBase):
    """PUT payload (full replace, RFC 7231). utente_id injected server-side.

    Inherits validators from FarmacoBase (F3-S2 CP1).
    """


class FarmacoResponse(FarmacoBase):
    """GET response payload. All 18 columns."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    utente_id: int
    created_at: datetime
    updated_at: datetime
