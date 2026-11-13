"""
Pins of the Mini's services as make prod-check reads them --
scripts/audit/servizi_mini.py, part 2 of the fermo visibile (decisions of
Roberto, 2026-11-13, 20:58 and 21:41).

Both directions of every verdict, on texts built here and never on the
Mini: a LaunchAgent loaded and as it should be is OK, one not loaded, one with
KeepAlive not running, one that exited with a code other than 0 is ROSSO; a
heartbeat ok and fresh is OK, one absent, old or not ok is ROSSO; the
monitor's line once and https is OK, absent is INFO (choice 5 B), twice or
not https or unreadable is ROSSO. A check always red would be a gate always
closed. The readings ask the Mini for nothing but launchctl print, one
SELECT and two counts of grep: never the value of the configuration.

The two copies the script keeps, the threshold of decision 33 B and the name
of the planner's row, are held equal to their seats here.

This file lives in backend/tests for the reason test_g21_livello.py does: the
mutation bench runs pytest and vitest only (CLAUDE.md 13). Every pin has its
row in scripts/audit/mutazioni.py.
"""
from __future__ import annotations

import importlib.util
import re
from pathlib import Path

import pytest

from pharmatimer_api import canale

_RADICE = Path(__file__).resolve().parents[2]
_SPEC = importlib.util.spec_from_file_location("servizi_mini", _RADICE / "scripts" / "audit" / "servizi_mini.py")
_SM = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_SM)
Agente = _SM.stato_agenti.Agente

API = "com.pharmatimer.api-wrapper"
PASSATA = "com.pharmatimer.pianificatore"


# ------------------------------------------------------------ what the repo says


def test_agenti_del_deploy_sono_quelli_di_deploy_mini() -> None:
    testo = (_RADICE / "deploy" / "deploy-mini.sh").read_text(encoding="utf-8")
    assert _SM.agenti_del_deploy(testo) == [API, PASSATA]


def test_sempre_vivo_dal_plist_di_git() -> None:
    import plistlib

    with open(_RADICE / "deploy" / "launchd" / (API + ".plist"), "rb") as fh:
        assert _SM.sempre_vivo(plistlib.load(fh)) is True
    with open(_RADICE / "deploy" / "launchd" / (PASSATA + ".plist"), "rb") as fh:
        assert _SM.sempre_vivo(plistlib.load(fh)) is False


def test_soglia_uguale_a_quella_del_client() -> None:
    # Decision 33 B: one threshold for an old heartbeat, the client's seat.
    testo = (_RADICE / "src" / "domain" / "statoCanale.js").read_text(encoding="utf-8")
    (minuti,) = re.findall(r"export const SOGLIA_BATTITO_MS = (\d+) \* 60_000;", testo)
    assert _SM.SOGLIA_BATTITO_S == int(minuti) * 60


def test_nome_uguale_a_quello_del_canale() -> None:
    assert _SM.NOME_PIANIFICATORE == canale.NOME_PIANIFICATORE


# ------------------------------------------------------------ the LaunchAgents


def test_agenti_come_sul_mini_ok() -> None:
    api = Agente(API, True, state="running", pid=3338, runs=1, ultima_uscita="(never exited)")
    passata = Agente(PASSATA, True, state="not running", runs=20, ultima_uscita="0")
    assert _SM.giudica_agente(api, True)[0] == "OK"
    assert _SM.giudica_agente(passata, False)[0] == "OK"


@pytest.mark.parametrize("etichetta, deve_girare", [(API, True), (PASSATA, False)], ids=["api", "passata"])
def test_agente_non_caricato_rosso(etichetta, deve_girare) -> None:
    livello, testo = _SM.giudica_agente(Agente(etichetta, False), deve_girare)
    assert livello == "ROSSO"
    assert f"{etichetta} NON CARICATO" in testo
    assert f"launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/{etichetta}.plist" in testo


def test_api_wrapper_non_in_esecuzione_rosso() -> None:
    api = Agente(API, True, state="not running", runs=2, ultima_uscita="1")
    assert _SM.giudica_agente(api, True)[0] == "ROSSO"


def test_pianificatore_uscito_con_1_rosso() -> None:
    passata = Agente(PASSATA, True, state="not running", runs=21, ultima_uscita="1")
    assert _SM.giudica_agente(passata, False)[0] == "ROSSO"


@pytest.mark.parametrize(
    "state, uscita", [("not running", "(never exited)"), ("running", "0")], ids=["mai-uscito", "in-passata"]
)
def test_pianificatore_mai_uscito_o_in_passata_ok(state, uscita) -> None:
    passata = Agente(PASSATA, True, state=state, runs=1, ultima_uscita=uscita)
    assert _SM.giudica_agente(passata, False)[0] == "OK"


def test_stato_che_non_si_legge_rosso() -> None:
    assert _SM.giudica_agente(Agente(PASSATA, True), False)[0] == "ROSSO"


# ------------------------------------------------------------ the heartbeat


def test_battito_fresco_ok() -> None:
    assert _SM.giudica_battito(("ok", 12_000)) == ("OK", "BATTITO esito ok, 12 s fa (soglia 300 s)")


def test_battito_al_confine_della_soglia() -> None:
    assert _SM.giudica_battito(("ok", 300_999))[0] == "OK"
    assert _SM.giudica_battito(("ok", 301_000))[0] == "ROSSO"


def test_battito_vecchio_rosso() -> None:
    assert _SM.giudica_battito(("ok", 10 * 60_000))[0] == "ROSSO"


def test_battito_assente_rosso() -> None:
    assert _SM.giudica_battito(None)[0] == "ROSSO"


@pytest.mark.parametrize("esito", ["chiave_assente", "errore"])
def test_battito_con_esito_non_ok_rosso(esito) -> None:
    assert _SM.giudica_battito((esito, 12_000))[0] == "ROSSO"


def test_battito_di_meno_di_un_secondo_nel_futuro_ok() -> None:
    # UNIX_TIMESTAMP() counts whole seconds: the age can come out below zero.
    assert _SM.giudica_battito(("ok", -500))[0] == "OK"


# ------------------------------------------------------------ the monitor's line


def test_monitor_configurato_ok() -> None:
    assert _SM.giudica_monitor((1, 1))[0] == "OK"


def test_monitor_assente_info() -> None:
    # Choice 5 B of 2026-11-13: said, not blocking.
    assert _SM.giudica_monitor((0, 0)) == ("INFO", "MONITOR non configurato: il battito non parte")


@pytest.mark.parametrize("conteggi", [(2, 2), (2, 1)], ids=["due-https", "due-una-https"])
def test_monitor_due_righe_rosso(conteggi) -> None:
    # The reason too: two lines, whatever they carry, are two lines.
    livello, testo = _SM.giudica_monitor(conteggi)
    assert livello == "ROSSO"
    assert "2 righe MONITOR_URL" in testo


def test_monitor_non_https_rosso() -> None:
    livello, testo = _SM.giudica_monitor((1, 0))
    assert livello == "ROSSO"
    assert "non porta un indirizzo https" in testo


def test_monitor_che_non_si_legge_rosso() -> None:
    assert _SM.giudica_monitor(None)[0] == "ROSSO"


# ------------------------------------------------------------ what the readings ask and how they read


def test_le_letture_sono_in_sola_lettura() -> None:
    comando = _SM.comando_launchctl([API, PASSATA])
    assert re.findall(r"launchctl (\w+)", comando) == ["print"]
    assert _SM.SQL_BATTITO.startswith("SELECT ") and ";" not in _SM.SQL_BATTITO
    monitor = _SM.comando_monitor()
    # Two counts of grep, and nothing else reads the file: never the value.
    assert monitor.count("grep -cE ") == 2
    assert not re.search(r"\b(cat|sed|awk|head|tail|less|more|cut|source)\b", monitor)


def test_leggi_blocchi() -> None:
    uscita = f"== agente {API}\n\tstate = running\n== uscita 0\n== agente {PASSATA}\nnon trovato\n== uscita 113\n"
    assert _SM.leggi_blocchi(uscita) == {API: ("\tstate = running", 0), PASSATA: ("non trovato", 113)}


@pytest.mark.parametrize(
    "uscita, conteggi",
    [
        ("1\n== uscita 0\n1\n== uscita 0\n", (1, 1)),
        ("0\n== uscita 1\n0\n== uscita 1\n", (0, 0)),
        ("== uscita 2\n== uscita 2\n", None),
    ],
    ids=["una", "nessuna", "file-assente"],
)
def test_leggi_conteggi(uscita, conteggi) -> None:
    assert _SM.leggi_conteggi(uscita) == conteggi


# ------------------------------------------------------------ main, with a fake Mini


def _mini(agenti=None, battito=(0, "ok\t12000\n", ""), monitor=(0, "0\n== uscita 1\n0\n== uscita 1\n", "")):
    """In place of ssh: answers by the command it receives."""
    agenti = agenti or (
        0,
        f"== agente {API}\n\tstate = running\n\tpid = 3338\n\truns = 1\n\tlast exit code = (never exited)\n"
        f"== uscita 0\n== agente {PASSATA}\n\tstate = not running\n\truns = 20\n\tlast exit code = 0\n"
        "== uscita 0\n",
        "",
    )

    def esegui(remoto: str):
        if "launchctl print" in remoto:
            return agenti
        if "push_pianificatore" in remoto:
            return battito
        if "grep -cE" in remoto:
            return monitor
        raise AssertionError(remoto)

    return esegui


_ARGS = ["--mysql", "/opt/homebrew/bin/mysql --defaults-file=/x.cnf", "--db", "pharmatimer"]


def test_main_verde_col_monitor_assente(capsys) -> None:
    assert _SM.main(_ARGS, esegui=_mini()) == 0
    uscita = capsys.readouterr().out
    assert "OK    com.pharmatimer.api-wrapper caricato e in esecuzione" in uscita
    assert "OK    com.pharmatimer.pianificatore caricato" in uscita
    assert "OK    BATTITO esito ok, 12 s fa" in uscita
    assert "INFO  MONITOR non configurato: il battito non parte" in uscita


def test_main_rosso_con_un_agente_scaricato(capsys) -> None:
    agenti = (
        0,
        f"== agente {API}\n\tstate = running\n== uscita 0\n== agente {PASSATA}\nCould not find service\n"
        "== uscita 113\n",
        "",
    )
    assert _SM.main(_ARGS, esegui=_mini(agenti=agenti)) == 1
    assert f"ROSSO {PASSATA} NON CARICATO" in capsys.readouterr().out


def test_main_rosso_col_mini_che_non_risponde(capsys) -> None:
    def muto(remoto: str):
        return 255, "", "ssh: connect to host mini port 22: Operation timed out"

    assert _SM.main(_ARGS, esegui=muto) == 1
    uscita = capsys.readouterr().out
    assert "ROSSO LAUNCHAGENT non misurabili dal Mini" in uscita
    assert "ROSSO BATTITO non misurabile dal Mini" in uscita
    assert "ROSSO MONITOR: la riga MONITOR_URL" in uscita
