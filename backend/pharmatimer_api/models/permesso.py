"""Pydantic models for permessi (caregiver authorizations).

NEW F3-S4-beta N+5.E-beta CP1 -- CRUD permessi caregiver scoped admin-on-paziente.

Schema aligned with backend/db/schema/permessi.sql (post N+5.E-alpha-bis):
  - id PK auto
  - caregiver_id FK utenti.id
  - paziente_id FK utenti.id
  - permesso ENUM('read', 'write', 'admin')
  - notifiche_caregiver_attive BOOLEAN DEFAULT FALSE
  - created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  - UNIQUE (caregiver_id, paziente_id)
"""
# SENTINEL_N5E_BETA_CP1_MODELS_PERMESSO
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# ENUM aligned with DDL permessi.permesso
PermessoLevel = Literal["read", "write", "admin"]


class PermessoCreate(BaseModel):
    """Input model for POST /api/permessi (admin-on-paziente grant)."""

    caregiver_id: int = Field(..., gt=0, description="Utente che riceve il permesso")
    paziente_id: int = Field(..., gt=0, description="Utente sui cui dati il caregiver opera")
    permesso: PermessoLevel = Field(..., description="Livello di accesso")
    notifiche_caregiver_attive: bool | None = Field(
        default=False,
        description="Opt-in notifiche caregiver (Q16=B)",
    )


class PermessoUpdate(BaseModel):
    """Input model for PUT /api/permessi/{id} (admin-on-paziente update).

    All fields optional; empty body returns row unchanged (idempotent no-op).
    """

    permesso: PermessoLevel | None = None
    notifiche_caregiver_attive: bool | None = None


class PermessoResponse(BaseModel):
    """Output model for GET/POST/PUT /api/permessi*."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    caregiver_id: int
    paziente_id: int
    permesso: PermessoLevel
    notifiche_caregiver_attive: bool
    created_at: datetime
