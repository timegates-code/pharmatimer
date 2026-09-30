"""Shared helpers of the Web Push router tests. No test_ prefix: pytest does not collect it."""
from __future__ import annotations

import base64
import hashlib
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


def attivazione_s(pool, endpoint: str) -> int:
    """Start of the current activation, epoch seconds, as the planner reads it."""
    return righe(
        pool,
        "SELECT UNIX_TIMESTAMP(created_at) AS s FROM push_subscriptions WHERE endpoint = %s",
        (endpoint,),
    )[0]["s"]


def imposta_attivazione(pool, endpoint: str, secondi: int) -> None:
    """Move the start of the activation: FROM_UNIXTIME in a UTC session, no DST in between."""
    conn = pool.get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SET time_zone = '+00:00'")
        cur.execute(
            "UPDATE push_subscriptions SET created_at = FROM_UNIXTIME(%s) WHERE endpoint = %s",
            (secondi, endpoint),
        )
        conn.commit()
        cur.close()
    finally:
        conn.close()


def esegui(pool, sql: str, params: tuple = ()) -> None:
    conn = pool.get_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        cur.close()
    finally:
        conn.close()


def crea_iscrizione(pool, utente_id: int, endpoint: str, attivazione_ms: int, chiavi=None) -> int:
    """An active subscription whose current activation began at attivazione_ms."""
    chiavi = chiavi or iscrizione(endpoint, nuovo_device())["keys"]
    conn = pool.get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SET time_zone = '+00:00'")
        cur.execute(
            "INSERT INTO push_subscriptions (utente_id, endpoint, p256dh_key, auth_key, attiva, "
            "endpoint_hash, device_id, confermata_ms, created_at) "
            "VALUES (%s, %s, %s, %s, TRUE, %s, %s, %s, FROM_UNIXTIME(%s))",
            (
                utente_id,
                endpoint,
                chiavi["p256dh"],
                chiavi["auth"],
                hashlib.sha256(endpoint.encode("utf-8")).hexdigest(),
                nuovo_device(),
                attivazione_ms,
                attivazione_ms // 1000,
            ),
        )
        sub_id = cur.lastrowid
        conn.commit()
        cur.close()
    finally:
        conn.close()
    return sub_id


def metti_voce(
    pool,
    utente_id: int,
    farmaco_id: int,
    data: str,
    dose_numero: int,
    istante_ms: int,
    ora_ricalcolata: str | None = None,
    titolo: str = "Medrol",
    corpo: str = "Dopo colazione",
) -> None:
    esegui(
        pool,
        "INSERT INTO push_calendario (utente_id, farmaco_id, data, dose_numero, istante_ms, "
        "ora_ricalcolata, titolo, corpo) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        (utente_id, farmaco_id, data, dose_numero, istante_ms, ora_ricalcolata, titolo, corpo),
    )


def metti_pubblicazione(pool, utente_id: int, avviso_fine_ms: int, entro_ms: int) -> None:
    esegui(
        pool,
        "INSERT INTO push_pubblicazioni (utente_id, device_id, pubblicata_ms, orizzonte_fino_ms, "
        "avviso_fine_ms, avviso_fine_entro_ms, voci) VALUES (%s, NULL, %s, %s, %s, %s, 0) AS nuova "
        "ON DUPLICATE KEY UPDATE pubblicata_ms = nuova.pubblicata_ms, "
        "avviso_fine_ms = nuova.avviso_fine_ms, avviso_fine_entro_ms = nuova.avviso_fine_entro_ms",
        (utente_id, avviso_fine_ms - 60 * MINUTO, avviso_fine_ms, avviso_fine_ms, entro_ms),
    )


def metti_log(
    pool,
    utente_id: int,
    farmaco_id: int,
    data: str,
    dose_numero: int,
    stato: str,
    ora_ricalcolata: str | None = None,
) -> None:
    esegui(
        pool,
        "INSERT INTO log_assunzioni (utente_id, farmaco_id, data, dose_numero, ora_prevista, "
        "ora_ricalcolata, stato) VALUES (%s, %s, %s, %s, '08:00:00', %s, %s)",
        (utente_id, farmaco_id, data, dose_numero, ora_ricalcolata, stato),
    )
