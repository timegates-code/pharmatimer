"""
PharmaTimer F3-S4-alpha CP1 N+5.E-alpha
Pydantic models for utenti CRUD endpoints (POST + DELETE).

Ratifiche (par.22.85 + par.11.I-S3):
- Sub-AMB N+5.E-alpha.F: UtenteCreate Literal 'paziente'|'caregiver', rifiuta 'owner' -> 422
- Sub-AMB N+5.E-alpha.B: UtenteCreatedResponse expose token_plain one-shot

CP1 F3-S4-alpha N+5.E-alpha NEW SENTINEL
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class UtenteCreate(BaseModel):
    """POST /api/utenti request payload.

    Pydantic Literal rifiuta ruolo='owner' al validation layer (422).
    Spec sez. 11.6 vincolo "1 owner per DB" enforced senza business logic.
    """

    nome_visualizzato: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Nome visualizzato utente (strip whitespace, non vuoto)",
    )
    ruolo: Literal["paziente", "caregiver"] = Field(
        default="paziente",
        description="Ruolo utente, 'owner' rifiutato a livello Pydantic",
    )

    model_config = ConfigDict(str_strip_whitespace=True)


class UtenteResponse(BaseModel):
    """Generic utenti response (no token exposure).

    Used internally and as base for UtenteCreatedResponse.
    """

    id: int
    nome_visualizzato: str
    ruolo: str
    attivo: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UtenteCreatedResponse(UtenteResponse):
    """POST /api/utenti response (201).

    Sub-AMB N+5.E-alpha.B: token_plain is visible ONCE in this response only.
    Never persisted as plain (only token_hash SHA-256 stored in utenti table).
    """

    token_plain: str = Field(
        ...,
        description="Token one-shot in chiaro (43 char base64url). Visibile una sola volta.",
    )
