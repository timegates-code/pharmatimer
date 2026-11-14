"""
Pins of the restart of the deploy's LaunchAgents -- deploy/riavvia_agenti.py,
part 1 of the fermo visibile: choices 1 A and 2 A of the F1 of 2026-11-13,
decision 1 of Roberto at 21:41.

Every case runs on a fake launchd with a clock of its own, FintoLaunchd: no
launchctl, no Mini, no real wait, the plists under tmp_path. The real
launchctl is switched off for the whole file, so that no test can reach it,
and SIGHUP and SIGINT are put back as they were after each test.

The cases of the F1, in both directions where there is a gate: plists
unchanged give the kickstart of the API, no command to the pass and a pass
of the new code checked, with exit 0 and not with 1; a changed plist waits
for the pass in progress and never cuts it, nor past the bound; a bootstrap
that fails is tried again, and one that always fails is SCARICATO with its
command and leaves the agents after it untouched; SIGHUP and SIGINT are
ignored and a closed output does not stop the sequence; an agent not loaded
is loaded without a bootout; a plist from git that does not hold touches
nothing. Besides those: a bootout that does not end at once (case d), an
error after a bootout, the pass in progress at the start that does not
count as the pass of the new code, the API without a new pid, and the
wiring in deploy-mini.sh.

The installed plists of the cases are written again by plistlib: they are
equal to git's in content and not in bytes, so the comparison of content is
pinned by every case with unchanged plists.

The fake speaks the form of launchctl print measured on the Mini on
2026-11-11 (deploy/stato_agenti.py). What the real launchctl does is proven
at the deploy, D1.

This file lives in backend/tests for the reason test_g21_livello.py does: the
mutation bench runs pytest and vitest only (CLAUDE.md 13). Every pin has its
row in scripts/audit/mutazioni.py.
"""
from __future__ import annotations

import importlib.util
import plistlib
import shutil
import signal
from pathlib import Path

import pytest

_RADICE = Path(__file__).resolve().parents[2]
_SPEC = importlib.util.spec_from_file_location("riavvia_agenti", _RADICE / "deploy" / "riavvia_agenti.py")
_RA = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_RA)

API = "com.pharmatimer.api-wrapper"
PASSATA = "com.pharmatimer.pianificatore"
AGENTI = [API, PASSATA]
LAUNCHD = _RADICE / "deploy" / "launchd"
DOMINIO = "gui/501"
NON_TROVATO = 113
ERRORE_IO = 5


@pytest.fixture(autouse=True)
def _niente_launchctl_vero(monkeypatch):
    def vietato(*_args, **_kwargs):
        raise AssertionError("il launchctl vero non si lancia dai test")

    monkeypatch.setattr(_RA, "launchctl", vietato)
    monkeypatch.setattr(_RA, "del_mini", vietato)


@pytest.fixture(autouse=True)
def _segnali():
    # Not SIG_IGN before the run, whatever the parent left: the pin must see the script set it.
    prima = {s: signal.getsignal(s) for s in (signal.SIGHUP, signal.SIGINT)}
    signal.signal(signal.SIGHUP, signal.SIG_DFL)
    signal.signal(signal.SIGINT, signal.default_int_handler)
    yield
    for s, gestore in prima.items():
        signal.signal(s, gestore if gestore is not None else signal.SIG_DFL)


class Servizio:
    """One LaunchAgent of the fake domain."""

    def __init__(self, a_giri: bool) -> None:
        self.a_giri = a_giri
        self.caricato = False
        self.runs = 0
        self.pid: int | None = None
        self.uscita = "(never exited)"
        self.fine: float | None = None  # the end of the pass in progress
        self.scatto: float | None = None  # the next firing of StartInterval
        self.via: float | None = None  # when a bootout takes it out of the domain


class FintoLaunchd:
    """launchd for the two agents of the deploy, on a clock of its own.

    The pass: StartInterval 60, a pass of `durata` s, a firing missed while a
    pass runs, RunAtLoad at the bootstrap. The API: KeepAlive, a process
    always running. A pass killed while it runs is recorded in `uccise`.
    """

    INTERVALLO = 60.0

    def __init__(
        self,
        installati: Path,
        *,
        caricati=(API, PASSATA),
        in_corso: float | None = None,
        scatto: float = 30.0,
        durata: float = 2.0,
        uscite=(),
        bootstrap_falliti=None,
        ritardo_bootout: float = 0.0,
        kickstart_inerte: bool = False,
    ) -> None:
        self.installati = installati
        self.t = 0.0
        self.durata = durata
        self.uscite = list(uscite)  # the exits of the passes that end, in order; then 0
        self.bootstrap_falliti = dict(bootstrap_falliti or {})
        self.ritardo_bootout = ritardo_bootout
        self.kickstart_inerte = kickstart_inerte
        self.comandi: list[tuple[float, list[str]]] = []
        self.uccise: list[tuple[float, str]] = []
        self.segnali = None
        self._pid = 3000
        self.servizi = {API: Servizio(False), PASSATA: Servizio(True)}
        for a in caricati:
            s = self.servizi[a]
            s.caricato = True
            s.runs = 5
            if s.a_giri:
                s.uscita = "0"
                s.scatto = scatto
                if in_corso is not None:  # a pass that started before the run, ending at in_corso
                    s.pid = self._nuovo_pid()
                    s.fine = in_corso
            else:
                s.pid = self._nuovo_pid()

    def _nuovo_pid(self) -> int:
        self._pid += 1
        return self._pid

    def _parti(self, s: Servizio) -> None:
        s.runs += 1
        s.pid = self._nuovo_pid()
        s.fine = self.t + self.durata

    def _evento(self):
        eventi = []
        for a, s in self.servizi.items():
            if s.via is not None:
                eventi.append((s.via, 0, a))
            if s.caricato and s.fine is not None:
                eventi.append((s.fine, 1, a))
            if s.caricato and s.scatto is not None:
                eventi.append((s.scatto, 2, a))
        return min(eventi) if eventi else None

    def _avanza(self, t1: float) -> None:
        while (evento := self._evento()) is not None and evento[0] <= t1:
            t, tipo, a = evento
            self.t = max(self.t, t)
            s = self.servizi[a]
            if tipo == 0:  # the bootout ends: the service leaves the domain
                s.via, s.caricato, s.pid, s.fine, s.scatto = None, False, None, None, None
            elif tipo == 1:  # the pass ends
                s.fine, s.pid = None, None
                s.uscita = str(self.uscite.pop(0)) if self.uscite else "0"
            else:  # a firing of StartInterval, missed while a pass runs
                s.scatto = t + self.INTERVALLO
                if s.fine is None:
                    self._parti(s)
        self.t = max(self.t, t1)

    def dormi(self, secondi: float) -> None:
        self._avanza(self.t + secondi)

    def __call__(self, argomenti: list[str]) -> tuple[int, str]:
        self.comandi.append((self.t, list(argomenti)))
        verbo = argomenti[0]
        if verbo != "print" and self.segnali is None:
            self.segnali = (signal.getsignal(signal.SIGHUP), signal.getsignal(signal.SIGINT))
        if verbo == "print":
            return self._stampa(argomenti[1])
        if verbo == "kickstart":
            assert argomenti[1] == "-k"
            return self._kickstart(self._etichetta(argomenti[2]))
        if verbo == "bootout":
            return self._bootout(self._etichetta(argomenti[1]))
        if verbo == "bootstrap":
            assert argomenti[1] == DOMINIO
            return self._bootstrap(Path(argomenti[2]))
        raise AssertionError(argomenti)

    @staticmethod
    def _etichetta(bersaglio: str) -> str:
        dominio, _, etichetta = bersaglio.rpartition("/")
        assert dominio == DOMINIO
        return etichetta

    def _stampa(self, bersaglio: str) -> tuple[int, str]:
        a = self._etichetta(bersaglio)
        s = self.servizi[a]
        if not s.caricato:
            return NON_TROVATO, f'Could not find service "{a}" in domain for port\n'
        righe = [
            f"{bersaglio} = {{",
            f"\tactive count = {1 if s.pid else 0}",
            f"\tpath = {self.installati / (a + '.plist')}",
            f"\tstate = {'running' if s.pid else 'not running'}",
            f"\truns = {s.runs}",
        ]
        if s.pid:
            righe.append(f"\tpid = {s.pid}")
        righe += [f"\tlast exit code = {s.uscita}", "\tevent triggers = {", "\t\tstate = active", "\t}", "}"]
        return 0, "\n".join(righe) + "\n"

    def _kickstart(self, a: str) -> tuple[int, str]:
        s = self.servizi[a]
        if not s.caricato:
            return NON_TROVATO, f'Could not find service "{a}" in domain for port\n'
        if s.fine is not None:
            self.uccise.append((self.t, a))
            s.fine = None
        if self.kickstart_inerte:
            return 0, ""
        if s.a_giri:
            self._parti(s)
        else:
            s.pid = self._nuovo_pid()
            s.runs += 1
        return 0, ""

    def _bootout(self, a: str) -> tuple[int, str]:
        s = self.servizi[a]
        if not s.caricato or s.via is not None:
            return 3, "Boot-out failed: 3: No such process\n"
        if s.fine is not None:
            self.uccise.append((self.t, a))
        s.fine, s.pid, s.scatto = None, None, None
        s.via = self.t + self.ritardo_bootout
        self._avanza(self.t)
        return 0, ""

    def _bootstrap(self, plist: Path) -> tuple[int, str]:
        a = plist.stem
        assert plist == self.installati / f"{a}.plist"
        # What is loaded is git's plist, installed before.
        assert plistlib.loads(plist.read_bytes()) == plistlib.loads((LAUNCHD / plist.name).read_bytes())
        s = self.servizi[a]
        if s.caricato:
            return ERRORE_IO, "Bootstrap failed: 5: Input/output error\n"
        if self.bootstrap_falliti.get(a, 0) > 0:
            self.bootstrap_falliti[a] -= 1
            return ERRORE_IO, "Bootstrap failed: 5: Input/output error\n"
        s.caricato, s.runs, s.uscita = True, 0, "(never exited)"
        if s.a_giri:  # RunAtLoad, then StartInterval
            s.scatto = self.t + self.INTERVALLO
            self._parti(s)
        else:  # RunAtLoad and KeepAlive
            s.pid = self._nuovo_pid()
            s.runs = 1
        return 0, ""


def _scena(tmp_path: Path, *, cambiati=(), **finto):
    """git's plists in tmp_path/launchd, the installed ones in tmp_path/LaunchAgents (git's in
    content, or changed in content for the agents in cambiati), the fake launchd, an Ambiente on
    them, and the list of the lines of the run."""
    sorgente = tmp_path / "launchd"
    installati = tmp_path / "LaunchAgents"
    sorgente.mkdir()
    installati.mkdir()
    for a in AGENTI:
        shutil.copyfile(LAUNCHD / f"{a}.plist", sorgente / f"{a}.plist")
        with open(LAUNCHD / f"{a}.plist", "rb") as fh:
            dati = plistlib.load(fh)
        if a in cambiati:
            dati["ThrottleInterval"] = 30
        with open(installati / f"{a}.plist", "wb") as fh:
            plistlib.dump(dati, fh)
    launchd = FintoLaunchd(installati, **finto)
    righe: list[str] = []
    amb = _RA.Ambiente(
        launchctl=launchd,
        dominio=DOMINIO,
        sorgente=sorgente,
        installati=installati,
        backups=tmp_path / "backups",
        orologio=lambda: launchd.t,
        dormi=launchd.dormi,
        scrivi=righe.append,
        marca=lambda: "20261114_003000",
    )
    return launchd, amb, righe


def _esegui(amb) -> int:
    return _RA.main(AGENTI, ambiente=amb)


def _cambi(launchd: FintoLaunchd, etichetta: str | None = None) -> list[list[str]]:
    """The commands that change a service, of one agent if it is named."""
    return [
        c
        for _t, c in launchd.comandi
        if c[0] != "print"
        and (etichetta is None or c[-1].endswith(f"/{etichetta}") or c[-1].endswith(f"/{etichetta}.plist"))
    ]


def _verbi(launchd: FintoLaunchd, etichetta: str | None = None) -> list[str]:
    return [c[0] for c in _cambi(launchd, etichetta)]


# ------------------------------------------------------------ plists unchanged


def test_plist_invariati_kickstart_dell_api_e_passata_verificata(tmp_path) -> None:
    launchd, amb, righe = _scena(tmp_path)
    assert _esegui(amb) == 0
    assert _cambi(launchd) == [["kickstart", "-k", f"{DOMINIO}/{API}"]]
    assert launchd.uccise == []
    uscita = "".join(righe)
    assert f"OK    {API} caricato: state = running" in uscita
    assert f"OK    {PASSATA} caricato: state = not running" in uscita
    assert "la passata partita dopo il riavvio e uscita con 0" in uscita
    assert uscita.rstrip().endswith("VERDE  ogni LaunchAgent e caricato e verificato")
    # The copies of the installed plists, as the deploy made them before.
    assert sorted(p.name for p in (tmp_path / "backups").iterdir()) == [
        f"{API}.predeploy.20261114_003000.plist",
        f"{PASSATA}.predeploy.20261114_003000.plist",
    ]


def test_passata_dopo_il_riavvio_che_esce_1_rosso(tmp_path) -> None:
    _launchd, amb, righe = _scena(tmp_path, uscite=[1])
    assert _esegui(amb) == 1
    uscita = "".join(righe)
    assert f"ROSSO {PASSATA} caricato" in uscita
    assert "la passata partita dopo il riavvio e uscita con 1" in uscita


def test_la_passata_in_corso_all_avvio_non_e_quella_del_codice_nuovo(tmp_path) -> None:
    # Case e: the pass running at the start ends with 0, the first one of the new code with 1.
    launchd, amb, righe = _scena(tmp_path, in_corso=10.0, uscite=[0, 1])
    assert _esegui(amb) == 1
    assert "la passata partita dopo il riavvio e uscita con 1" in "".join(righe)
    assert launchd.uccise == []


def test_kickstart_senza_pid_nuovo_rosso(tmp_path) -> None:
    _launchd, amb, righe = _scena(tmp_path, kickstart_inerte=True)
    assert _esegui(amb) == 1
    uscita = "".join(righe)
    assert f"ROSSO {API} caricato" in uscita
    assert "non in esecuzione con un pid nuovo entro 30 s" in uscita


def test_dai_plist_di_git_la_passata_va_a_giri_l_api_no() -> None:
    for a, atteso in ((API, False), (PASSATA, True)):
        with open(LAUNCHD / f"{a}.plist", "rb") as fh:
            assert _RA.a_giri(plistlib.load(fh)) is atteso


# ------------------------------------------------------------ plists changed, agents not loaded


def test_plist_cambiato_a_passata_in_corso_nessun_bootout_finche_gira(tmp_path) -> None:
    launchd, amb, _righe = _scena(tmp_path, cambiati=(PASSATA,), in_corso=25.0)
    assert _esegui(amb) == 0
    assert launchd.uccise == []
    assert _verbi(launchd, PASSATA) == ["bootout", "bootstrap"]
    (t_bootout,) = [t for t, c in launchd.comandi if c[0] == "bootout"]
    assert t_bootout >= 25.0


def test_passata_oltre_il_tetto_nessun_bootout_resta_caricato(tmp_path) -> None:
    launchd, amb, righe = _scena(tmp_path, cambiati=(PASSATA,), in_corso=200.0)
    assert _esegui(amb) == 1
    assert _cambi(launchd, PASSATA) == []
    assert launchd.uccise == []
    assert launchd.servizi[PASSATA].caricato
    assert "passata in corso oltre 120 s: nessun bootout" in "".join(righe)


def test_bootstrap_che_fallisce_due_volte_poi_riesce(tmp_path) -> None:
    launchd, amb, _righe = _scena(tmp_path, cambiati=(API,), bootstrap_falliti={API: 2})
    assert _esegui(amb) == 0
    assert _verbi(launchd, API) == ["bootout", "bootstrap", "bootstrap", "bootstrap"]


def test_bootstrap_solo_dopo_che_il_servizio_e_uscito_dal_dominio(tmp_path) -> None:
    # Case d: a bootout whose service leaves the domain 3 s later.
    launchd, amb, _righe = _scena(tmp_path, cambiati=(API,), ritardo_bootout=3.0)
    assert _esegui(amb) == 0
    assert _verbi(launchd, API) == ["bootout", "bootstrap"]


@pytest.mark.parametrize("etichetta", [API, PASSATA], ids=["api", "passata"])
def test_bootstrap_sempre_fallito_scaricato_col_comando(tmp_path, etichetta) -> None:
    launchd, amb, righe = _scena(tmp_path, cambiati=(etichetta,), bootstrap_falliti={etichetta: 99})
    assert _esegui(amb) == 1
    uscita = "".join(righe)
    assert f"ROSSO {etichetta} SCARICATO: nessun bootstrap riuscito in 10 tentativi" in uscita
    plist = tmp_path / "LaunchAgents" / f"{etichetta}.plist"
    assert f"per ricaricarlo, sul Mini: launchctl bootstrap {DOMINIO} {plist}" in uscita
    assert _verbi(launchd, etichetta).count("bootstrap") == 10


def test_dopo_uno_scaricato_gli_agenti_seguenti_non_si_toccano(tmp_path) -> None:
    launchd, amb, righe = _scena(tmp_path, cambiati=AGENTI, bootstrap_falliti={API: 99})
    assert _esegui(amb) == 1
    assert _cambi(launchd, PASSATA) == []
    assert launchd.servizi[PASSATA].caricato
    assert f"{PASSATA}: nessun comando, perche {API} e SCARICATO" in "".join(righe)


def test_agente_scaricato_all_inizio_ricaricato_senza_bootout(tmp_path) -> None:
    launchd, amb, _righe = _scena(tmp_path, caricati=(API,))
    assert _esegui(amb) == 0
    assert _verbi(launchd, PASSATA) == ["bootstrap"]
    assert launchd.servizi[PASSATA].caricato


def test_errore_dopo_il_bootout_il_bootstrap_si_tenta_lo_stesso(tmp_path) -> None:
    launchd, amb, righe = _scena(tmp_path, cambiati=(API,))
    guasto = {"armato": False}

    def launchctl(argomenti: list[str]) -> tuple[int, str]:
        if argomenti[0] == "bootout":
            guasto["armato"] = True
        elif argomenti[0] == "print" and guasto["armato"]:
            guasto["armato"] = False
            raise RuntimeError("lettura guasta")
        return launchd(argomenti)

    amb.launchctl = launchctl
    assert _esegui(amb) == 0
    assert _verbi(launchd, API) == ["bootout", "bootstrap"]
    assert "errore dopo il bootout, RuntimeError: il bootstrap si tenta lo stesso" in "".join(righe)


@pytest.mark.parametrize("guasto", ["illeggibile", "etichetta"])
def test_plist_di_git_che_non_regge_nessun_comando_che_cambia_lo_stato(tmp_path, guasto) -> None:
    launchd, amb, righe = _scena(tmp_path, cambiati=AGENTI)
    if guasto == "illeggibile":
        (amb.sorgente / f"{PASSATA}.plist").write_text("<plist><dict><key>Label</key>", encoding="utf-8")
    else:
        with open(amb.sorgente / f"{PASSATA}.plist", "wb") as fh:
            plistlib.dump({"Label": "com.pharmatimer.altro", "StartInterval": 60}, fh)
    prima = {a: (amb.installati / f"{a}.plist").read_bytes() for a in AGENTI}
    assert _esegui(amb) == 1
    assert _cambi(launchd) == []
    assert {a: (amb.installati / f"{a}.plist").read_bytes() for a in AGENTI} == prima
    assert "nessun LaunchAgent toccato" in "".join(righe)


# ------------------------------------------------------------ nothing stops it halfway


def test_sighup_e_sigint_ignorati_al_primo_comando_che_cambia_un_servizio(tmp_path) -> None:
    launchd, amb, _righe = _scena(tmp_path)
    _esegui(amb)
    assert launchd.segnali == (signal.SIG_IGN, signal.SIG_IGN)


def test_uscita_chiusa_la_sequenza_arriva_in_fondo(tmp_path) -> None:
    # Case c: the ssh connection falls, and every write fails from the first one.
    launchd, amb, _righe = _scena(tmp_path, cambiati=AGENTI)

    def chiusa(_testo: str) -> None:
        raise BrokenPipeError(32, "Broken pipe")

    amb.scrivi = chiusa
    assert _esegui(amb) == 0
    assert _verbi(launchd) == ["bootout", "bootstrap", "bootout", "bootstrap"]
    assert all(s.caricato for s in launchd.servizi.values())


# ------------------------------------------------------------ the wiring in deploy-mini.sh


def test_deploy_mini_lancia_il_riavvio_con_agenti() -> None:
    testo = (_RADICE / "deploy" / "deploy-mini.sh").read_text(encoding="utf-8")
    codice = [r for r in testo.splitlines() if not r.lstrip().startswith("#")]
    assert len([r for r in codice if "deploy/riavvia_agenti.py $AGENTI" in r]) == 1
    # The restart in the ssh string is gone, and with it the grep of case e.
    assert [r for r in codice if "launchctl" in r] == []
