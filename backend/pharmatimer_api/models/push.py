"""
PharmaTimer -- Web Push reminder channel, branch A: payloads and responses of
routers/push.py. Decisions 8, 11, 12, 15 and 16 of STATO_CORRENTE.md.

The server never computes a time (decision 8). The checks below compare
numbers the phone sent with each other and with the tolerance constant; none
of them turns a wall-clock value into an instant.
"""
from __future__ import annotations

import base64
import binascii
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from pharmatimer_api import canale

# A sanity bound on one publication, not a clinical number: the plan window is
# three days (constants.js, PLAN_TOTAL_DAYS) and the pilot takes nine doses a day.
VOCI_MAX = 500
_BIGINT_MAX = 2**63 - 1


def _b64url_bytes(valore: str) -> bytes:
    """Strict base64url decode, padding optional; ValueError on any other character."""
    try:
        return base64.b64decode(valore + "=" * (-len(valore) % 4), altchars=b"-_", validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("not base64url") from exc


class ChiaviIscrizione(BaseModel):
    """PushSubscription.toJSON().keys, as the browser gives it."""

    p256dh: str = Field(..., min_length=1, max_length=200)
    auth: str = Field(..., min_length=1, max_length=100)

    @field_validator("p256dh")
    @classmethod
    def _p256dh(cls, v: str) -> str:
        grezza = _b64url_bytes(v)
        if len(grezza) != 65 or grezza[0] != 0x04:
            raise ValueError("p256dh must be an uncompressed P-256 point")
        return v

    @field_validator("auth")
    @classmethod
    def _auth(cls, v: str) -> str:
        if len(_b64url_bytes(v)) != 16:
            raise ValueError("auth must be 16 bytes")
        return v


class IscrizionePayload(BaseModel):
    """PUT /api/push/iscrizione: the browser's subscription plus the phone's own id.

    device_id is the phone's id, so that one phone keeps one active
    subscription (v07_push.sql). expirationTime and any other field of the
    browser's object are ignored.
    """

    endpoint: str = Field(..., min_length=1, max_length=500)
    keys: ChiaviIscrizione
    device_id: UUID
    device_label: str | None = Field(default=None, max_length=100)

    @field_validator("endpoint")
    @classmethod
    def _endpoint_https(cls, v: str) -> str:
        if not v.startswith("https://"):
            raise ValueError("a push endpoint is an https URL")
        return v


class IscrizioneResponse(BaseModel):
    device_id: str | None
    device_label: str | None
    attiva: bool
    confermata_ms: int | None
    disattivata_ms: int | None
    motivo_disattivazione: str | None


class VoceCalendario(BaseModel):
    """One dose of the resolved calendar, keyed like idx_log_slot_unique (v02).

    istante_ms is the instant the phone computed (decision 8). ora_ricalcolata
    is the wall-clock value it computed it from, NULL for a dose that is only
    prevista: the planner compares it with the log by equality (decision 11),
    so it must be naive and whole-second, exactly like the log column. A value
    with an offset would need a conversion, which decision 11 excludes.
    """

    farmaco_id: int = Field(..., gt=0)
    data: date
    dose_numero: int = Field(..., ge=1)
    istante_ms: int = Field(..., gt=0, le=_BIGINT_MAX)
    ora_ricalcolata: datetime | None = None
    titolo: str = Field(..., min_length=1, max_length=100)
    corpo: str = Field(..., max_length=255)

    @field_validator("ora_ricalcolata")
    @classmethod
    def _parete_al_secondo(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return v
        if v.tzinfo is not None:
            raise ValueError("ora_ricalcolata is wall clock: no offset")
        if v.microsecond != 0:
            raise ValueError("ora_ricalcolata is whole-second, like the log column")
        return v


class CalendarioPayload(BaseModel):
    """PUT /api/push/calendario: the whole calendar of the plan window (decision 12).

    avviso_fine_ms and avviso_fine_entro_ms are the end-of-horizon notice and
    its deadline, both computed by the phone (condition of decision 12). The
    one condition the server can check without computing a time is checked
    here: the notice comes after the window of the last dose has closed.
    """

    device_id: UUID
    orizzonte_fino_ms: int = Field(..., gt=0, le=_BIGINT_MAX)
    avviso_fine_ms: int = Field(..., gt=0, le=_BIGINT_MAX)
    avviso_fine_entro_ms: int = Field(..., gt=0, le=_BIGINT_MAX)
    voci: list[VoceCalendario] = Field(..., max_length=VOCI_MAX)

    @model_validator(mode="after")
    def _coerenza(self) -> CalendarioPayload:
        chiavi = [(v.farmaco_id, v.data, v.dose_numero) for v in self.voci]
        if len(set(chiavi)) != len(chiavi):
            raise ValueError("one entry per dose: (farmaco_id, data, dose_numero) repeated")
        if self.avviso_fine_entro_ms <= self.avviso_fine_ms:
            raise ValueError("avviso_fine_entro_ms must come after avviso_fine_ms")
        if self.voci:
            ultimo = max(v.istante_ms for v in self.voci)
            if self.avviso_fine_ms < ultimo + canale.TOLLERANZA_PUSH_MS:
                raise ValueError(
                    "avviso_fine_ms must come after the window of the last dose "
                    f"(istante + {canale.TOLLERANZA_PUSH_MIN} min)"
                )
        return self


class PubblicazioneResponse(BaseModel):
    device_id: str | None
    pubblicata_ms: int
    orizzonte_fino_ms: int
    avviso_fine_ms: int
    avviso_fine_entro_ms: int
    voci: int


class ChiaveResponse(BaseModel):
    chiave_pubblica: str


class CanaleResponse(BaseModel):
    attivo: bool
    motivo: str | None


class BattitoResponse(BaseModel):
    """The planner's heartbeat. eta_ms is measured on the server clock only."""

    ultima_passata_ms: int
    eta_ms: int
    esito: str
    dettaglio: str | None


class InvioResponse(BaseModel):
    device_id: str | None
    farmaco_id: int
    data: date
    dose_numero: int
    istante_ms: int
    forma: str | None
    stato: str
    motivo: str | None
    http_status: int | None
    deciso_ms: int
    inviato_ms: int | None


class AvvisoFineResponse(BaseModel):
    device_id: str | None
    avviso_fine_ms: int
    entro_ms: int
    stato: str
    motivo: str | None
    http_status: int | None
    deciso_ms: int
    inviato_ms: int | None


class StatoCanaleResponse(BaseModel):
    """GET /api/push/stato: always 200 while the DB answers.

    pianificatore is None when the planner never wrote its row: never started.
    """

    ora_server_ms: int
    tolleranza_min: int
    canale: CanaleResponse
    pianificatore: BattitoResponse | None
    iscrizioni: list[IscrizioneResponse]
    pubblicazione: PubblicazioneResponse | None
    ultimi_invii: list[InvioResponse]
    ultimi_avvisi_fine: list[AvvisoFineResponse]
