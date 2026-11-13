"""
Pin of Roberto's condition of 21:41 on choice 4 A (2026-11-13): the thread of
the heartbeat toward the monitor is daemon, so the planner's process ends
even with the GET hung, within the longest wait. Proven on the process, not
on the function.

The planner's own entry point, pianificatore.main, runs in a fresh
interpreter on the test DB with a usable VAPID key: the pass completes with
heartbeat 'ok', so the heartbeat toward the monitor leaves. The GET is
replaced with one that never returns, after leaving a mark, so the test
knows that the hung call really happened. A twin run with an empty address
measures the same process without the heartbeat. The two outcomes, distinct
by construction:
  - daemon thread: the run exits 0, within monitor.ATTESA_S of its twin;
  - a thread the interpreter waits for at exit: the run never ends, the
    timeout of subprocess.run stops it, and the test is red.

DB_NAME, DB_HOST and DB_PORT go to the child as in test_seed_owner.py: the
test DB, on the server the identity guard admitted. The address is a
placeholder of the reserved .invalid domain (RFC 2606), never the real one.
Its row in scripts/audit/mutazioni.py: monitor-thread-non-daemon.
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

from pharmatimer_api import monitor
from pharmatimer_api.config import settings

from .aiuti_push import SUB
from .guardia_server import parametri_di_test

BACKEND = Path(__file__).resolve().parents[1]
URL = "https://monitor.invalid/battito/processo"
# Beyond the wait, how long a run may last before it counts as stuck.
MARGINE_S = 15

_PASSATA = """
import sys, threading
from pathlib import Path
from pharmatimer_api import monitor, pianificatore

segno = Path(sys.argv[1])

def appesa(url, attesa_s):
    segno.write_text("chiamata", encoding="utf-8")
    threading.Event().wait()

monitor._get = appesa
print(pianificatore.__file__, flush=True)
sys.exit(pianificatore.main())
"""


def _passata(pem: str, url: str, segno: Path) -> tuple[subprocess.CompletedProcess, float]:
    """One run of the planner's main in a fresh interpreter: (result, seconds)."""
    env = os.environ.copy()
    env["DB_NAME"] = settings.DB_NAME_TEST
    env["DB_HOST"] = parametri_di_test()["host"]
    env["DB_PORT"] = str(parametri_di_test()["port"])
    env["VAPID_PEM_FILE"] = pem
    env["VAPID_SUB"] = SUB
    env["MONITOR_URL"] = url
    inizio = time.monotonic()
    p = subprocess.run(
        [sys.executable, "-c", _PASSATA, str(segno)],
        cwd=BACKEND,
        env=env,
        capture_output=True,
        text=True,
        timeout=monitor.ATTESA_S + MARGINE_S,
    )
    return p, time.monotonic() - inizio


def test_con_la_get_appesa_il_processo_della_passata_finisce_entro_l_attesa(pem_vapid, tmp_path) -> None:
    pem, _ = pem_vapid
    segno_gemello = tmp_path / "gemello"
    gemello, durata_gemello = _passata(pem, "", segno_gemello)
    assert gemello.returncode == 0, gemello.stderr
    assert not segno_gemello.exists()  # without an address, no call
    # The child must have imported THIS tree, or it measures another one.
    assert Path(gemello.stdout.splitlines()[0]).resolve().is_relative_to(BACKEND)

    segno = tmp_path / "appesa"
    appesa, durata = _passata(pem, URL, segno)
    assert appesa.returncode == 0, appesa.stderr
    assert segno.exists()  # the GET really left, and hung
    assert durata - durata_gemello < monitor.ATTESA_S + 2
    assert "battito al monitor non riuscito: scaduto" in appesa.stderr
    # Decision 1: the address never in an output.
    assert "monitor.invalid" not in appesa.stdout + appesa.stderr
