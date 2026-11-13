"""
PharmaTimer -- the heartbeat toward the external monitor. Decision 1 of
Roberto, 2026-11-13 at 20:58; choices 3 A and 4 A of the F1 of the fermo
visibile, with his condition of 21:41.

    batti(settings.MONITOR_URL)

One GET toward an address that comes from the Mini's configuration,
MONITOR_URL in its .env.dev (config.py), outside the repo: never in the repo,
in the tests or in an output. Without an address nothing leaves. The planner
calls it at the end of a complete pass whose heartbeat is 'ok'
(pianificatore.main), so the monitor's silence means that the reminders are
not leaving, whatever the cause. The monitor sees only that the Mini is alive
(decision of 2026-11-12): the call carries nothing of doses, farmaci, prese
or users -- no query, no body, only the address. One attempt, never retried,
never followed to a redirect.

It never waits longer than ATTESA_S, the name resolution included, which the
timeouts of requests do not bound: the GET runs in a DAEMON thread and the
caller stops waiting at ATTESA_S. A GET still hung then cannot keep the
process alive, since the interpreter does not wait for a daemon thread at
exit (Roberto's condition, proven on the process by
tests/test_monitor_processo.py).

The outcome is a short token and never the address: the text of a requests
exception carries host and path, so of an exception only the class name is
kept.

The planner's second door to the network, after invio.py, and the only one
toward the monitor. No SQL, no DB.
"""
from __future__ import annotations

import threading
from collections.abc import Callable

import requests

# The longest wait for one heartbeat, seconds: the connection, the reading and
# the name resolution together (choice 4 A).
ATTESA_S = 5.0

OK = "ok"
NON_CONFIGURATO = "non_configurato"
NON_VALIDO = "non_valido"
SCADUTO = "scaduto"


def _get(url: str, attesa_s: float) -> int:
    """One GET to url as it is, no redirect: the HTTP status."""
    with requests.get(url, timeout=(attesa_s, attesa_s), allow_redirects=False) as risposta:
        return risposta.status_code


def batti(
    url: str | None,
    attesa_s: float = ATTESA_S,
    richiedi: Callable[[str, float], int] | None = None,
) -> str:
    """One heartbeat toward url, waited for at most attesa_s. Never raises.

    The outcome: 'non_configurato' without an address, 'non_valido' when it is
    not https, 'ok' on a 2xx, 'http_<status>' on any other status, the class
    name of the exception, or 'scaduto' when the wait ran out. Never the
    address. richiedi defaults to _get, looked up at call time.
    """
    if not url:
        return NON_CONFIGURATO
    if not url.startswith("https://"):
        return NON_VALIDO
    richiedi = richiedi or _get
    esito = [SCADUTO]

    def lavoro() -> None:
        try:
            stato = richiedi(url, attesa_s)
        except Exception as exc:
            esito[0] = type(exc).__name__
            return
        esito[0] = OK if 200 <= stato < 300 else f"http_{stato}"

    filo = threading.Thread(target=lavoro, name="battito-monitor", daemon=True)
    filo.start()
    filo.join(attesa_s)
    return SCADUTO if filo.is_alive() else esito[0]
