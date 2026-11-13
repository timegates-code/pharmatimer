"""
Pins of pharmatimer_api.monitor -- the heartbeat toward the external monitor.
Decision 1 of Roberto, 2026-11-13; choices 3 A and 4 A of the F1 of the fermo
visibile, with his condition of 21:41.

On the function, with the request injected: no network. The process-level
pin of the condition (a hung GET does not keep the planner's process alive)
is tests/test_monitor_processo.py, apart because it lasts the whole wait.

Both directions where there is a gate: an address that works gives exactly
one request; no address, or one that is not https, gives none.

The address here is a placeholder of the reserved .invalid domain (RFC 2606),
never the real one, which lives only in the Mini's .env.dev. Every pin has its
row in scripts/audit/mutazioni.py.
"""
from __future__ import annotations

import threading
import time

import pytest
import requests

from pharmatimer_api import monitor

URL = "https://monitor.invalid/battito/prova"


class Richiesta:
    """In place of monitor._get: records every call, answers a status or raises."""

    def __init__(self, esito) -> None:
        self.esito = esito
        self.chiamate: list[tuple[str, float]] = []

    def __call__(self, url: str, attesa_s: float) -> int:
        self.chiamate.append((url, attesa_s))
        if isinstance(self.esito, BaseException):
            raise self.esito
        return self.esito


@pytest.mark.parametrize("url", [None, ""], ids=["nessuno", "vuoto"])
def test_senza_indirizzo_nessuna_richiesta(url) -> None:
    richiesta = Richiesta(200)
    assert monitor.batti(url, richiedi=richiesta) == "non_configurato"
    assert richiesta.chiamate == []


@pytest.mark.parametrize(
    "url", ["http://monitor.invalid/battito/prova", "monitor.invalid/battito"], ids=["http", "senza-schema"]
)
def test_indirizzo_non_https_nessuna_richiesta(url) -> None:
    richiesta = Richiesta(200)
    assert monitor.batti(url, richiedi=richiesta) == "non_valido"
    assert richiesta.chiamate == []


def test_una_sola_richiesta_all_indirizzo() -> None:
    # The other direction: an address that works is called, once, and never again.
    richiesta = Richiesta(200)
    assert monitor.batti(URL, richiedi=richiesta) == "ok"
    assert richiesta.chiamate == [(URL, monitor.ATTESA_S)]


@pytest.mark.parametrize(
    "stato, esito", [(204, "ok"), (301, "http_301"), (404, "http_404"), (500, "http_500")]
)
def test_esito_dallo_stato(stato, esito) -> None:
    assert monitor.batti(URL, richiedi=Richiesta(stato)) == esito


def test_eccezione_solo_il_nome_della_classe() -> None:
    # The text of a requests exception names host and path: never kept.
    guasto = requests.exceptions.ConnectionError(
        "HTTPSConnectionPool(host='monitor.invalid', port=443): "
        "Max retries exceeded with url: /battito/prova"
    )
    esito = monitor.batti(URL, richiedi=Richiesta(guasto))
    assert esito == "ConnectionError"


def test_richiesta_appesa_torna_entro_l_attesa() -> None:
    # The wait is bounded whatever the request does, the name resolution
    # included. The hung request is released after the test, never earlier.
    rilascio = threading.Event()

    def appesa(url: str, attesa_s: float) -> int:
        rilascio.wait(10)
        return 200

    try:
        inizio = time.monotonic()
        esito = monitor.batti(URL, attesa_s=0.2, richiedi=appesa)
        trascorso = time.monotonic() - inizio
    finally:
        rilascio.set()
    assert esito == "scaduto"
    assert trascorso < 2.0


class _Risposta:
    status_code = 200

    def __enter__(self):
        return self

    def __exit__(self, *_) -> None:
        return None


def test_la_get_porta_solo_l_indirizzo(monkeypatch) -> None:
    # Decision 1: the call carries no data of doses, farmaci, prese or users.
    # The real GET: the address as it is, the bounded timeout, no redirect,
    # and nothing else -- no query, no body, no header of its own.
    chiamate = []

    def finta_get(*args, **kwargs):
        chiamate.append((args, kwargs))
        return _Risposta()

    monkeypatch.setattr(monitor.requests, "get", finta_get)
    assert monitor.batti(URL) == "ok"
    assert chiamate == [
        ((URL,), {"timeout": (monitor.ATTESA_S, monitor.ATTESA_S), "allow_redirects": False})
    ]
