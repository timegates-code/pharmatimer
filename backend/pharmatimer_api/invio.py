"""
PharmaTimer -- Web Push reminder channel, branch A: the transport. One POST
to the push service, and what its outcome certifies. It is the planner's only
door to the network and the only module that imports pywebpush, which loads
aiohttp at import: the API never imports it (tests/test_canale.py).

Condition 2 of Roberto, 2026-09-30: a message is attempted again only when
the outcome CERTIFIES that the push service did not accept it, by white
list. What certifies neither an acceptance nor a final refusal stays
'in_invio' with motivo 'esito_ignoto' and is never attempted again: a dose
reaches a phone at most once (v07_push.sql).

Measured 2026-09-30 in backend/venv (requests 2.34.2, urllib3 2.8.0), on a
local server that read the whole request and closed without answering:
requests raises a GENERIC ConnectionError ("Connection aborted") for a
request that had already left. The generic class certifies nothing. A
connection never established is recognised only as ConnectTimeout
(requests/adapters.py :714-717) or as a ConnectionError whose reason is
urllib3's NewConnectionError, NameResolutionError included (:729). The
explicit timeout is split between connection and read.

  accettato     201, 202                              (RFC 8030)
  da_ritentare  408, 429, 503; ConnectTimeout; NewConnectionError
  respinto      every other 4xx, 404 and 410 also switching the
                subscription off; 501 and 505; a failure before the POST
                left (the request was never built: encryption, signature)
  esito_ignoto  500, 502, 504 and every other 5xx; 1xx, 3xx, any 2xx other
                than 201 and 202; every other exception once the POST left

Retry-After is not honoured beyond the planner's own 60 s cadence: v07 has
no column for a "not before", and the window of decision 16 bounds the
attempts anyway.
"""
from __future__ import annotations

from dataclasses import dataclass

import requests
from py_vapid import Vapid, VapidException
from pywebpush import WebPushException, webpush
from urllib3.exceptions import MaxRetryError, NewConnectionError

from pharmatimer_api import canale

TIMEOUT_CONNESSIONE_S = 5
TIMEOUT_LETTURA_S = 15

ACCETTATI = frozenset({201, 202})
RITENTABILI = frozenset({408, 429, 503})
SPENGONO = frozenset({404, 410})
RIFIUTI_5XX = frozenset({501, 505})

# The states of push_dispatch and push_avvisi_fine this module decides (v07).
ACCETTATO = "accettato"
DA_RITENTARE = "da_ritentare"
RESPINTO = "respinto"
IN_INVIO = "in_invio"

# The reasons it names.
ESITO_IGNOTO = "esito_ignoto"
CONNESSIONE_MAI_STABILITA = "connessione_mai_stabilita"
RICHIESTA_NON_PARTITA = "richiesta_non_partita"
ISCRIZIONE_MORTA = "iscrizione_morta"

_DETTAGLIO_MAX = 255


@dataclass(frozen=True)
class Firma:
    """The key the planner signs with, or why it cannot (decision 15)."""

    vapid: object | None
    sub: str | None
    motivo: str | None


def prepara_firma(pem_file: str | None, sub: str | None) -> Firma:
    """Read the key once per pass and try one signature with the library itself.

    canale.stato_chiave checks the file and the prefix of the sub; py_vapid
    is stricter on the sub (its own pattern), so a trial signature on a
    fixed audience keeps that rule in one seat, the library. Never
    Vapid.from_file: the key comes from canale.leggi_chiave_privata.
    """
    stato = canale.stato_chiave(pem_file, sub)
    if not stato.attivo:
        return Firma(None, None, stato.motivo)
    try:
        vapid = Vapid(private_key=canale.leggi_chiave_privata(pem_file))
        vapid.sign({"sub": sub, "aud": "https://pharmatimer.invalid"})
    except VapidException:
        return Firma(None, None, canale.SUB_NON_VALIDO)
    except Exception:
        # The file changed between the two reads of this pass.
        return Firma(None, None, canale.PEM_NON_VALIDO)
    return Firma(vapid, sub, None)


@dataclass(frozen=True)
class Esito:
    """What one POST certifies. iscrizione_morta: 404 or 410, switch it off."""

    stato: str
    motivo: str | None
    http_status: int | None
    dettaglio: str | None
    iscrizione_morta: bool = False


class _Sessione:
    """The only requests session of a POST, fresh each time.

    No socket reused from an earlier POST, so an abort cannot come from a
    stale connection; the split timeout and no redirects are forced here,
    whatever the caller passed; `partita` records whether the POST was
    attempted at all.
    """

    def __init__(self, fabbrica) -> None:
        self._sessione = fabbrica()
        self.partita = False

    def post(self, url, **kwargs):
        kwargs["timeout"] = (TIMEOUT_CONNESSIONE_S, TIMEOUT_LETTURA_S)
        kwargs["allow_redirects"] = False
        self.partita = True
        return self._sessione.post(url, **kwargs)

    def close(self) -> None:
        self._sessione.close()


def _breve(testo) -> str | None:
    if testo is None:
        return None
    testo = str(testo)
    return testo if len(testo) <= _DETTAGLIO_MAX else testo[: _DETTAGLIO_MAX - 3] + "..."


def connessione_mai_stabilita(exc: BaseException) -> bool:
    """True only when the exception proves that no byte of the request left."""
    if isinstance(exc, requests.exceptions.ConnectTimeout):
        return True
    radice = exc.args[0] if exc.args else None
    return isinstance(radice, MaxRetryError) and isinstance(radice.reason, NewConnectionError)


def esito_di_status(status: int, dettaglio: str | None = None) -> Esito:
    """The white list of condition 2, on an HTTP status."""
    if status in ACCETTATI:
        return Esito(ACCETTATO, None, status, None)
    if status in RITENTABILI:
        return Esito(DA_RITENTARE, f"http_{status}", status, _breve(dettaglio))
    if status in SPENGONO:
        return Esito(RESPINTO, ISCRIZIONE_MORTA, status, _breve(dettaglio), iscrizione_morta=True)
    if 400 <= status < 500 or status in RIFIUTI_5XX:
        return Esito(RESPINTO, f"http_{status}", status, _breve(dettaglio))
    return Esito(IN_INVIO, ESITO_IGNOTO, status, _breve(dettaglio))


def esito_di_eccezione(exc: BaseException, partita: bool) -> Esito:
    """The white list of condition 2, on an exception."""
    dettaglio = _breve(f"{type(exc).__name__}: {exc}")
    if not partita:
        return Esito(RESPINTO, RICHIESTA_NON_PARTITA, None, dettaglio)
    if connessione_mai_stabilita(exc):
        return Esito(DA_RITENTARE, CONNESSIONE_MAI_STABILITA, None, dettaglio)
    return Esito(IN_INVIO, ESITO_IGNOTO, None, dettaglio)


def invia(
    iscrizione: dict,
    dati: str,
    ttl_s: int,
    vapid,
    sub: str,
    fabbrica=requests.Session,
) -> Esito:
    """One POST, encrypted (aes128gcm) and signed, with an explicit TTL.

    iscrizione is {"endpoint", "keys": {"p256dh", "auth"}}. vapid is a
    py_vapid key object, never a path: with a path pywebpush may reach
    Vapid.from_file. The claims dict is fresh at every call because pywebpush
    mutates it. No Topic header: at most one message per dose and phone
    leaves nothing to coalesce, and Apple refused topics outside 6-8
    characters (sonda-iphone-esiti.md :1073-1089).
    """
    sessione = _Sessione(fabbrica)
    try:
        risposta = webpush(
            subscription_info=iscrizione,
            data=dati,
            vapid_private_key=vapid,
            vapid_claims={"sub": sub},
            ttl=ttl_s,
            headers={"Urgency": "high"},
            requests_session=sessione,
        )
        return esito_di_status(risposta.status_code)
    except WebPushException as exc:
        if exc.response is not None:
            return esito_di_status(exc.status_code, getattr(exc.response, "text", None))
        return esito_di_eccezione(exc, sessione.partita)
    except Exception as exc:
        return esito_di_eccezione(exc, sessione.partita)
    finally:
        sessione.close()
