"""Shared helpers of the Web Push router tests. No test_ prefix: pytest does not collect it."""
from __future__ import annotations

import base64
import os
import uuid

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from pharmatimer_api import canale
from pharmatimer_api.config import settings

# The router's clock in these tests: 2026-10-01T08:00:00Z.
ADESSO = 1_790_841_600_000
MINUTO = 60_000
SUB = "mailto:sonda@example.org"


def b64url(grezzo: bytes) -> str:
    return base64.urlsafe_b64encode(grezzo).rstrip(b"=").decode("ascii")


def fissa_orologio(monkeypatch, ms: int) -> None:
    monkeypatch.setattr(canale, "adesso_ms", lambda: ms)


def configura_vapid(monkeypatch, pem: str | None, sub: str | None) -> None:
    monkeypatch.setattr(settings, "VAPID_PEM_FILE", pem)
    monkeypatch.setattr(settings, "VAPID_SUB", sub)


def nuovo_device() -> str:
    return str(uuid.uuid4())


def iscrizione(endpoint: str, device_id: str, **extra) -> dict:
    """A PushSubscription.toJSON() with real key material, plus the phone's id."""
    punto = (
        ec.generate_private_key(ec.SECP256R1())
        .public_key()
        .public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    )
    return {
        "endpoint": endpoint,
        "expirationTime": None,
        "keys": {"p256dh": b64url(punto), "auth": b64url(os.urandom(16))},
        "device_id": device_id,
        **extra,
    }


def voce(farmaco_id: int, data: str, dose_numero: int, istante_ms: int, **extra) -> dict:
    return {
        "farmaco_id": farmaco_id,
        "data": data,
        "dose_numero": dose_numero,
        "istante_ms": istante_ms,
        "ora_ricalcolata": None,
        "titolo": "Farmaco",
        "corpo": "Promemoria farmaco",
        **extra,
    }


def calendario(device_id: str, voci: list[dict], **extra) -> dict:
    """A publication whose end notice sits one hour after the last window."""
    ultimo = max((v["istante_ms"] for v in voci), default=ADESSO)
    avviso = ultimo + 20 * MINUTO + 60 * MINUTO
    return {
        "device_id": device_id,
        "orizzonte_fino_ms": ultimo + 1,
        "avviso_fine_ms": avviso,
        "avviso_fine_entro_ms": avviso + 120 * MINUTO,
        "voci": voci,
        **extra,
    }


def righe(pool, sql: str, params: tuple = ()) -> list[dict]:
    conn = pool.get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params)
        risultato = cur.fetchall()
        cur.close()
        conn.commit()
    finally:
        conn.close()
    return risultato


def esegui(pool, sql: str, params: tuple = ()) -> None:
    conn = pool.get_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        cur.close()
    finally:
        conn.close()
