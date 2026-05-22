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
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


TipoFrequenza = Literal["intervallo", "fisso"]
RelazionePasto = Literal[
    "prima", "durante", "dopo", "stomaco_pieno", "lontano", "indifferente"
]


class FarmacoBase(BaseModel):
    """Shared writable fields. Excludes id/utente_id/timestamps (server-managed)."""

    nome: str = Field(..., min_length=1, max_length=100)
    principio_attivo: Optional[str] = Field(default=None, max_length=100)
    funzione: Optional[str] = Field(default=None, max_length=200)
    tipo_frequenza: TipoFrequenza
    intervallo_ore: Optional[Decimal] = None
    intervallo_minimo_ore: Optional[Decimal] = None
    dosi_giornaliere: int = Field(..., ge=1)
    relazione_pasto: RelazionePasto
    dettaglio_pasto: Optional[str] = Field(default=None, max_length=100)
    note: Optional[str] = None
    data_inizio: date
    data_fine: Optional[date] = None
    attivo: bool = True
    demo: bool = False


class FarmacoCreate(FarmacoBase):
    """POST payload (deferred F3-S2). utente_id injected server-side from token."""


class FarmacoResponse(FarmacoBase):
    """GET response payload. All 18 columns."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    utente_id: int
    created_at: datetime
    updated_at: datetime
