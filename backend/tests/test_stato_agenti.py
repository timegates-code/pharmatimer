"""
Pins of the reading of `launchctl print` -- deploy/stato_agenti.py, the one
seat of it: make prod-check reads the Mini's LaunchAgents through it today,
and the restart of the deploy will (part 1 of the fermo visibile, decision 1
of Roberto, 2026-11-13 at 21:41).

The samples are the form measured on the Mini on 2026-11-11, fields on one
tab and nested blocks on two, never the real output of a run here: this
file runs on the Studio and in CI, where there is no such LaunchAgent.

It lives in backend/tests for the reason test_g21_livello.py does: the
mutation bench runs pytest and vitest only (CLAUDE.md 13). Every pin has its
row in scripts/audit/mutazioni.py.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

_DEPLOY = Path(__file__).resolve().parents[2] / "deploy"
_SPEC = importlib.util.spec_from_file_location("stato_agenti", _DEPLOY / "stato_agenti.py")
_SA = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_SA)

API = (
    "gui/501/com.pharmatimer.api-wrapper = {\n"
    "\tactive count = 1\n"
    "\tstate = running\n"
    "\truns = 1\n"
    "\tpid = 3338\n"
    "\tlast exit code = (never exited)\n"
    "\tevent triggers = {\n"
    "\t\tstate = active\n"
    "\t}\n"
    "}\n"
)
PASSATA = (
    "gui/501/com.pharmatimer.pianificatore = {\n"
    "\tstate = not running\n"
    "\truns = 20\n"
    "\tlast exit code = 0\n"
    "\trun interval = 60 seconds\n"
    "\t\tstate = active\n"
    "}\n"
)
# A nested block BEFORE the fields of the service: only one tab counts.
ANNIDATO_PRIMA = (
    "gui/501/com.pharmatimer.pianificatore = {\n"
    "\tendpoints = {\n"
    "\t\tstate = active\n"
    "\t\tpid = 999\n"
    "\t}\n"
    "\tstate = not running\n"
    "\truns = 3\n"
    "\tlast exit code = 1\n"
    "}\n"
)


def test_api_wrapper_come_sul_mini() -> None:
    a = _SA.leggi("com.pharmatimer.api-wrapper", API, 0)
    assert (a.caricato, a.state, a.pid, a.runs, a.ultima_uscita) == (
        True, "running", 3338, 1, "(never exited)"
    )
    assert a.in_esecuzione is True


def test_pianificatore_come_sul_mini() -> None:
    a = _SA.leggi("com.pharmatimer.pianificatore", PASSATA, 0)
    assert (a.caricato, a.state, a.pid, a.runs, a.ultima_uscita) == (True, "not running", None, 20, "0")
    assert a.in_esecuzione is False


def test_le_righe_annidate_non_contano() -> None:
    a = _SA.leggi("com.pharmatimer.pianificatore", ANNIDATO_PRIMA, 0)
    assert (a.state, a.pid, a.runs, a.ultima_uscita) == ("not running", None, 3, "1")


def test_solo_righe_annidate_nessuno_stato() -> None:
    a = _SA.leggi("com.pharmatimer.pianificatore", "x = {\n\t\tstate = active\n}\n", 0)
    assert a.caricato is True
    assert a.state is None


def test_codice_diverso_da_zero_non_caricato() -> None:
    # launchctl print of a service not in the domain fails: whatever it says, not loaded.
    a = _SA.leggi("com.pharmatimer.pianificatore", PASSATA, 113)
    assert (a.caricato, a.state, a.pid, a.runs, a.ultima_uscita) == (False, None, None, None, None)
