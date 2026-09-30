"""
PharmaTimer -- Web Push reminder channel, branch A: the single seat of the
channel's constants, of its clock and of the VAPID key reading, shared by the
API router (routers/push.py) and the planner. Decisions 15 and 16 of
STATO_CORRENTE.md, ratified 2026-09-29.

Two import rules, both pinned by tests/test_canale.py:

- pywebpush is never imported here, nor anywhere the API imports. It loads
  aiohttp at its own import (pywebpush/__init__.py:15, measured 2026-09-30),
  and the API serves the public key and nothing else of VAPID. The planner
  imports it for itself.
- py_vapid's Vapid.from_file is never called. On a missing file it GENERATES
  a new key and saves it at that path (py_vapid/__init__.py, from_file):
  decision 15 wants the opposite, a channel that goes off and says so. The
  PEM is read here with cryptography, and a missing file stays missing.

The channel compares instants as epoch milliseconds, UTC by definition
(v07_push.sql, header). adesso_ms() is its clock: never NOW(), never a naive
local time. One value comes from MySQL's clock, on the same machine: the
start of a subscription's current activation, push_subscriptions.created_at
(routers/push.py, iscrivi), written with CURRENT_TIMESTAMP and read only as
UNIX_TIMESTAMP(created_at), which returns the stored UTC value with no
session conversion.

Pure module: no SQL. The file read of the PEM is its only I/O.
"""
from __future__ import annotations

import base64
import json
import time
from dataclasses import dataclass

# Decision 16: a reminder leaves within [istante, istante + 20 min) and its
# TTL is what remains of that window, so it never reaches the phone later.
# The phone receives the value from the server (condition of decision 12),
# through GET /api/push/stato. TOLLERANZA_MIN = 15 in src/domain/constants.js
# is the badge threshold: a different quantity, not touched.
TOLLERANZA_PUSH_MIN = 20
TOLLERANZA_PUSH_MS = TOLLERANZA_PUSH_MIN * 60_000

# The planner's row in push_pianificatore (decision 9).
NOME_PIANIFICATORE = "pianificatore"

# Why the channel cannot sign, as /api/push/stato and the planner name it.
PEM_NON_CONFIGURATO = "pem_non_configurato"
PEM_ILLEGGIBILE = "pem_illeggibile"
PEM_NON_VALIDO = "pem_non_valido"
SUB_ASSENTE = "sub_assente"
SUB_NON_VALIDO = "sub_non_valido"


def adesso_ms() -> int:
    """The server clock as epoch milliseconds."""
    return time.time_ns() // 1_000_000


@dataclass(frozen=True)
class StatoChiave:
    """What the channel can do with its VAPID configuration.

    attivo: a readable P-256 key and a usable sub, so the planner can sign.
    motivo: why not, one of the constants above; None when attivo.
    chiave_pubblica: base64url of the uncompressed point, whenever the PEM
        reads, even without a sub: a subscription binds to the key only.
    """

    attivo: bool
    motivo: str | None
    chiave_pubblica: str | None


def leggi_chiave_privata(pem_file: str):
    """The EC P-256 private key in pem_file, or an exception.

    OSError when the file cannot be read, ValueError or TypeError when it does
    not hold an unencrypted P-256 key. Never creates or writes the file.
    """
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec

    with open(pem_file, "rb") as fh:
        dati = fh.read()
    chiave = serialization.load_pem_private_key(dati, password=None)
    if not isinstance(chiave, ec.EllipticCurvePrivateKey) or not isinstance(
        chiave.curve, ec.SECP256R1
    ):
        raise ValueError("the VAPID key must be EC P-256")
    return chiave


def chiave_pubblica(chiave) -> str:
    """base64url, unpadded, of the uncompressed public point: what subscribe() takes."""
    from cryptography.hazmat.primitives import serialization

    grezza = chiave.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    return base64.urlsafe_b64encode(grezza).rstrip(b"=").decode("ascii")


def stato_chiave(pem_file: str | None, sub: str | None) -> StatoChiave:
    """Read the VAPID configuration as it is now. Never raises."""
    if not pem_file:
        return StatoChiave(False, PEM_NON_CONFIGURATO, None)
    try:
        chiave = leggi_chiave_privata(pem_file)
    except OSError:
        return StatoChiave(False, PEM_ILLEGGIBILE, None)
    except Exception:
        return StatoChiave(False, PEM_NON_VALIDO, None)
    pubblica = chiave_pubblica(chiave)
    if not sub:
        return StatoChiave(False, SUB_ASSENTE, pubblica)
    if not sub.startswith(("mailto:", "https://")):
        return StatoChiave(False, SUB_NON_VALIDO, pubblica)
    return StatoChiave(True, None, pubblica)


def _json(oggetto: dict) -> str:
    return json.dumps(oggetto, ensure_ascii=False, separators=(",", ":"))


def payload_dose(titolo: str, corpo: str, istante_ms: int, farmaco_id: int, data, dose_numero: int) -> str:
    """The dose push as the service worker reads it (classic branch: decision 2
    excludes the declarative one). Title and body are the phone's own, composed
    and self-dated by the phone (I1); the slot key is there for the tag."""
    return _json(
        {
            "v": 1,
            "tipo": "dose",
            "titolo": titolo,
            "corpo": corpo,
            "istante_ms": istante_ms,
            "farmaco_id": farmaco_id,
            "data": data.isoformat(),
            "dose_numero": dose_numero,
        }
    )


# D3 A, 2026-10-01: the two texts the server composes. No farmaco, no time,
# no state asserted (I1, decisions 11 and 12): they only invite to open the
# app, which shows the true state. The dose push keeps the phone's own text.
TITOLO_AVVISI = "PharmaTimer"
CORPO_AVVISO_NEUTRO = "Apri l'app per controllare i promemoria."
CORPO_AVVISO_FINE = "Apri l'app per aggiornare i promemoria."


def payload_avviso_neutro() -> str:
    """The neutral notice of decision 11: nothing of the dose, not even its key."""
    return _json({"v": 1, "tipo": "avviso_neutro", "titolo": TITOLO_AVVISI, "corpo": CORPO_AVVISO_NEUTRO})


def payload_avviso_fine() -> str:
    """The end-of-horizon notice of decision 12: no dose data."""
    return _json({"v": 1, "tipo": "avviso_fine", "titolo": TITOLO_AVVISI, "corpo": CORPO_AVVISO_FINE})
