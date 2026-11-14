"""
PharmaTimer -- the restart of the deploy's LaunchAgents, on the Mini, at
step 6 of deploy/deploy-mini.sh:

    ~/PharmaTimer/.venv/bin/python ~/PharmaTimer/deploy/riavvia_agenti.py <label> ...

with the labels of AGENTI of deploy-mini.sh, in their order. Part 1 of the
fermo visibile: choices 1 A and 2 A of the F1 of 2026-11-13, decision 1 of
Roberto at 21:41. Before it, the ssh string of step 6 ran a bootout and at
once a bootstrap, with nothing that waited, retried or checked: a service
could stay unloaded under a generic red, and a connection that fell between
the two left it so with no red at all (cases a-f of the F1, section 1.2).

1. The plists from git, deploy/launchd/<label>.plist, are read with plistlib
   and checked before anything is touched: one that does not read, or whose
   Label is not its own name, is ROSSO, and nothing is installed or stopped.
   Each is compared, as content, with the one installed.
2. The installed plists are copied to backups/, and git's are installed in
   ~/Library/LaunchAgents with mode 644: at the automatic login launchd
   loads only those (ratifica A of 2026-10-01).
3. Agent by agent, in the order given:
   - plist unchanged and agent loaded: a job with StartInterval, the pass,
     gets no command. Its next pass imports the new code anyway (editable
     install, LESSONS.md #47), and a kill could cut a pass between decision
     and outcome, which leaves its reminder never retried (case f). Any
     other agent gets `launchctl kickstart -k`, which restarts its process
     and never unloads it;
   - plist changed, or agent not loaded: the pass in progress is waited for
     (at most ATTESA_PASSATA_S; beyond, ROSSO and no bootout), then bootout;
     then the wait until the service has left the domain (case d), then
     bootstrap, up to TENTATIVI times. An agent not loaded gets the
     bootstrap alone.
4. The check. A job with StartInterval must run a pass that STARTED after
   the reading of reference -- the one before its restart, or the one right
   after its bootstrap -- and that pass must exit 0, at most ATTESA_GIRO_S:
   the heartbeat make prod-check reads at step 7 is then one of the new code
   (case e). Any other agent must be running with a pid other than the one
   before.
5. The report closes every run, one line per agent, from a reading made
   then: loaded or SCARICATO, state, pid, runs, last exit code. An unloaded
   one carries the exact command that loads it again.
6. Nothing stops it halfway (case c): SIGHUP and SIGINT are ignored before
   anything else, an output that closes only silences the lines, and an
   error after a bootout never skips the bootstrap.
7. After an agent left unloaded, nothing of the following ones is changed.

Exit 0 when every agent is loaded and checked, 1 otherwise, 2 on a wrong
usage. Standard library only, for the Mini's python. launchctl, the clock,
the waits, the files and the output come from an Ambiente, so that the tests
run with none of the real ones.

Its pins: backend/tests/test_riavvia_agenti.py, for the reason CLAUDE.md 13
gives for the scripts of the gate. Every pin has its row in
scripts/audit/mutazioni.py.

No `from __future__ import annotations`, as in stato_agenti.py: the tests
load this module by its path, and a dataclass looks its module up in
sys.modules.
"""
import argparse
import difflib
import importlib.util
import os
import plistlib
import re
import shutil
import signal
import subprocess
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

_QUI = Path(__file__).resolve().parent
_SPEC = importlib.util.spec_from_file_location("stato_agenti", _QUI / "stato_agenti.py")
stato_agenti = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(stato_agenti)

OK = "OK"
ROSSO = "ROSSO"

# The bounds of choice 1 A, as the F1 gives them.
ATTESA_PASSATA_S = 120  # the pass in progress, before a bootout
ATTESA_GIRO_S = 150  # a pass started after the reference, ended with its exit
TENTATIVI = 10  # the bootstraps of one agent
# The bounds the F1 leaves to the script, declared in the commit that brings it.
ATTESA_SCARICO_S = 30  # after a bootout, until the service has left the domain
ATTESA_PROCESSO_S = 30  # a process with a new pid, after a kickstart or a bootstrap
PAUSA_S = 2  # between two bootstraps
PASSO_S = 1  # between two readings
TEMPO_COMANDO_S = 60  # one launchctl call

_ETICHETTA = re.compile(r"^[A-Za-z0-9._-]+$")


def launchctl(argomenti: list[str]) -> tuple[int, str]:
    """(exit code, output) of one launchctl call; -1 when it does not start or does not end."""
    try:
        p = subprocess.run(
            ["launchctl", *argomenti], capture_output=True, text=True, timeout=TEMPO_COMANDO_S
        )
    except (OSError, subprocess.SubprocessError) as exc:
        return -1, f"{type(exc).__name__}: {exc}"
    return p.returncode, p.stdout + p.stderr


def _scrivi_fd(testo: str) -> None:
    """To file descriptor 1, with no buffer: nothing is left for Python to flush at the exit."""
    dati = testo.encode("utf-8")
    while dati:
        dati = dati[os.write(1, dati):]


@dataclass
class Ambiente:
    """Everything the restart touches, so that a test can put each part in place of the real one."""

    launchctl: Callable[[list[str]], tuple[int, str]]
    dominio: str  # gui/<uid>
    sorgente: Path  # the plists from git, deploy/launchd
    installati: Path  # ~/Library/LaunchAgents
    backups: Path  # ~/PharmaTimer/backups
    orologio: Callable[[], float]
    dormi: Callable[[float], None]
    scrivi: Callable[[str], None]
    marca: Callable[[], str]  # the suffix of the copies in backups/


def _ora_marca() -> str:
    return time.strftime("%Y%m%d_%H%M%S")


def del_mini() -> Ambiente:
    """The real one: launchctl, the gui domain of this user, the deploy around this file."""
    return Ambiente(
        launchctl=launchctl,
        dominio=f"gui/{os.getuid()}",
        sorgente=_QUI / "launchd",
        installati=Path.home() / "Library" / "LaunchAgents",
        backups=_QUI.parent / "backups",
        orologio=time.monotonic,
        dormi=time.sleep,
        scrivi=_scrivi_fd,
        marca=_ora_marca,
    )


class Uscita:
    """The lines of a run. An output that closes, the ssh connection that falls, silences them
    and nothing else."""

    def __init__(self, scrivi: Callable[[str], None]) -> None:
        self._scrivi = scrivi
        self.chiusa = False

    def di(self, testo: str) -> None:
        if self.chiusa:
            return
        try:
            self._scrivi(testo + "\n")
        except OSError:
            self.chiusa = True


@dataclass(frozen=True)
class Esito:
    livello: str
    testo: str


def ignora_segnali() -> None:
    """Case c: a connection that falls, or a Ctrl-C, must not stop a restart halfway."""
    signal.signal(signal.SIGHUP, signal.SIG_IGN)
    signal.signal(signal.SIGINT, signal.SIG_IGN)


def leggi_plist(percorso: Path) -> tuple[dict | None, str | None]:
    """(content, None), or (None, reason) when the file is missing or is not a plist dict."""
    try:
        with open(percorso, "rb") as fh:
            dati = plistlib.load(fh)
    except FileNotFoundError:
        return None, "assente"
    except Exception as exc:  # a broken plist raises more than one kind of error
        return None, f"{type(exc).__name__}: {exc}"
    if not isinstance(dati, dict):
        return None, "non e un dizionario"
    return dati, None


def a_giri(plist: dict) -> bool:
    """A job that runs by passes, StartInterval: this script never kills one of its passes."""
    return "StartInterval" in plist


def leggi_agente(amb: Ambiente, etichetta: str):
    codice, testo = amb.launchctl(["print", f"{amb.dominio}/{etichetta}"])
    return stato_agenti.leggi(etichetta, testo, codice)


def aspetta(amb: Ambiente, etichetta: str, condizione, tetto_s: float):
    """The first reading that satisfies condizione, one every PASSO_S; None past tetto_s."""
    fine = amb.orologio() + tetto_s
    while True:
        agente = leggi_agente(amb, etichetta)
        if condizione(agente):
            return agente
        if amb.orologio() >= fine:
            return None
        amb.dormi(PASSO_S)


def descrivi(agente) -> str:
    return (
        f"state = {agente.state}, pid {agente.pid}, runs {agente.runs}, "
        f"last exit code = {agente.ultima_uscita}"
    )


def _ultima(testo: str) -> str:
    righe = [r.strip() for r in testo.splitlines() if r.strip()]
    return righe[-1][:160] if righe else "nessuna uscita"


def _differenze(installato: Path, git: Path) -> list[str]:
    def righe(p: Path) -> list[str]:
        return p.read_text(encoding="utf-8", errors="replace").splitlines()

    return list(difflib.unified_diff(righe(installato), righe(git), "installato", "git", lineterm=""))


def installa(sorgente: Path, destinazione: Path) -> None:
    """As install -m 644: a copy beside the destination, mode 644, then one rename."""
    provvisorio = destinazione.with_name(f".{destinazione.name}.nuovo")
    shutil.copyfile(sorgente, provvisorio)
    os.chmod(provvisorio, 0o644)
    os.replace(provvisorio, destinazione)


def prepara(amb: Ambiente, out: Uscita, agenti: list[str]) -> dict | None:
    """Steps 1 and 2: {label: (git's plist, changed)}, or None when no agent may be restarted."""
    di_git = {}
    for a in agenti:
        dati, motivo = leggi_plist(amb.sorgente / f"{a}.plist")
        if dati is None or dati.get("Label") != a:
            perche = motivo if dati is None else f"Label {dati.get('Label')!r}"
            out.di(f"ROSSO  il plist di git di {a} non regge ({perche}): nessun LaunchAgent toccato")
            return None
        di_git[a] = dati
    out.di("   plist di git letti e controllati: " + " ".join(agenti))
    marca = amb.marca()
    cambiati = {}
    try:
        amb.backups.mkdir(parents=True, exist_ok=True)
        for a in agenti:
            installato = amb.installati / f"{a}.plist"
            dati, motivo = leggi_plist(installato)
            cambiati[a] = (di_git[a], dati != di_git[a])
            if motivo == "assente":
                out.di(f"   {a}: non installato, nuovo")
                continue
            shutil.copy2(installato, amb.backups / f"{a}.predeploy.{marca}.plist")
            if dati is None:
                out.di(f"   {a}: installato ma illeggibile ({motivo}), copiato in backups/")
            elif dati != di_git[a]:
                out.di(f"   {a}: installato, diverso da git, copiato in backups/:")
                for riga in _differenze(installato, amb.sorgente / f"{a}.plist"):
                    out.di("      " + riga)
            else:
                out.di(f"   {a}: installato, uguale a git, copiato in backups/")
        for a in agenti:
            installa(amb.sorgente / f"{a}.plist", amb.installati / f"{a}.plist")
    except OSError as exc:
        out.di(
            f"ROSSO  copia o installazione dei plist fallita, {type(exc).__name__}: {exc}: "
            "nessun LaunchAgent riavviato"
        )
        return None
    out.di(f"   plist di git installati in {amb.installati}, modo 644")
    return cambiati


def verifica_processo(amb: Ambiente, etichetta: str, pid_prima) -> Esito:
    """A process of the agent running, with a pid other than pid_prima."""
    agente = aspetta(
        amb,
        etichetta,
        lambda g: g.caricato and g.in_esecuzione and g.pid is not None and g.pid != pid_prima,
        ATTESA_PROCESSO_S,
    )
    if agente is None:
        return Esito(ROSSO, f"non in esecuzione con un pid nuovo entro {ATTESA_PROCESSO_S} s")
    return Esito(OK, f"in esecuzione con il pid nuovo {agente.pid}")


def verifica_giro(amb: Ambiente, out: Uscita, etichetta: str, riferimento) -> Esito:
    """A pass started after the reading of reference, ended, with exit 0."""
    if riferimento.runs is None:
        return Esito(ROSSO, "runs non si legge: la passata dopo il riavvio non si verifica")
    out.di(f"   {etichetta}: aspetto una passata partita dopo il riavvio, al piu {ATTESA_GIRO_S} s")
    agente = aspetta(
        amb,
        etichetta,
        lambda g: not g.caricato
        or (
            g.runs is not None
            and g.runs > riferimento.runs
            and g.state == stato_agenti.NON_IN_ESECUZIONE
        ),
        ATTESA_GIRO_S,
    )
    if agente is None:
        return Esito(ROSSO, f"nessuna passata partita dopo il riavvio e conclusa entro {ATTESA_GIRO_S} s")
    if not agente.caricato:
        return Esito(ROSSO, "scaricato mentre aspettavo la passata")
    if agente.ultima_uscita != "0":
        return Esito(ROSSO, f"la passata partita dopo il riavvio e uscita con {agente.ultima_uscita}")
    return Esito(OK, "la passata partita dopo il riavvio e uscita con 0")


def bootstrap(amb: Ambiente, out: Uscita, etichetta: str) -> bool:
    """Up to TENTATIVI bootstraps of the installed plist: True at the first that succeeds."""
    plist = str(amb.installati / f"{etichetta}.plist")
    for n in range(1, TENTATIVI + 1):
        codice, testo = amb.launchctl(["bootstrap", amb.dominio, plist])
        if codice == 0:
            out.di(f"   {etichetta}: bootstrap riuscito al tentativo {n}")
            return True
        out.di(f"   {etichetta}: bootstrap {n} di {TENTATIVI} fallito, codice {codice}: {_ultima(testo)}")
        if n < TENTATIVI:
            amb.dormi(PAUSA_S)
    return False


def riavvia_agente(amb: Ambiente, out: Uscita, etichetta: str, plist: dict, cambiato: bool) -> Esito:
    """One agent, as choice 1 A says: its restart, then its check."""
    servizio = f"{amb.dominio}/{etichetta}"
    giri = a_giri(plist)
    prima = leggi_agente(amb, etichetta)
    if prima.caricato and not cambiato:
        if giri:
            out.di(f"   {etichetta}: plist invariato, nessun comando: la prossima passata legge il codice nuovo")
            return verifica_giro(amb, out, etichetta, prima)
        out.di(f"   {etichetta}: plist invariato: launchctl kickstart -k")
        codice, testo = amb.launchctl(["kickstart", "-k", servizio])
        if codice != 0:
            out.di(f"   {etichetta}: kickstart -k fallito, codice {codice}: {_ultima(testo)}")
        return verifica_processo(amb, etichetta, prima.pid)
    if prima.caricato:
        if giri:
            out.di(f"   {etichetta}: plist cambiato: aspetto la fine della passata in corso, al piu {ATTESA_PASSATA_S} s")
            ferma = aspetta(
                amb,
                etichetta,
                lambda g: not g.caricato or g.state == stato_agenti.NON_IN_ESECUZIONE,
                ATTESA_PASSATA_S,
            )
            if ferma is None:
                return Esito(
                    ROSSO,
                    f"passata in corso oltre {ATTESA_PASSATA_S} s: nessun bootout, resta caricato col plist di prima",
                )
        out.di(f"   {etichetta}: plist cambiato: bootout, poi bootstrap")
        try:
            codice, testo = amb.launchctl(["bootout", servizio])
            if codice != 0:
                out.di(f"   {etichetta}: bootout, codice {codice}: {_ultima(testo)}")
            if aspetta(amb, etichetta, lambda g: not g.caricato, ATTESA_SCARICO_S) is None:
                out.di(f"   {etichetta}: ancora caricato {ATTESA_SCARICO_S} s dopo il bootout")
        except Exception as exc:  # after a bootout, whatever happens, the bootstrap is tried
            out.di(f"   {etichetta}: errore dopo il bootout, {type(exc).__name__}: il bootstrap si tenta lo stesso")
    else:
        out.di(f"   {etichetta}: non caricato: bootstrap, senza bootout")
    riuscito = bootstrap(amb, out, etichetta)
    dopo = leggi_agente(amb, etichetta)
    if not dopo.caricato:
        return Esito(ROSSO, f"nessun bootstrap riuscito in {TENTATIVI} tentativi")
    if not riuscito:
        return Esito(ROSSO, "caricato, ma da nessun bootstrap di questo riavvio: e il servizio di prima")
    if giri:
        return verifica_giro(amb, out, etichetta, dopo)
    return verifica_processo(amb, etichetta, prima.pid)


def rapporto(amb: Ambiente, out: Uscita, agenti: list[str], esiti: dict) -> int:
    """The last lines of every run, from a reading of each agent made now: 0 when all is green."""
    out.di("== RAPPORTO DEL RIAVVIO ==")
    verde = True
    for a in agenti:
        agente = leggi_agente(amb, a)
        esito = esiti[a]
        if not agente.caricato:
            verde = False
            out.di(f"   ROSSO {a} SCARICATO: {esito.testo}")
            out.di(
                f"         per ricaricarlo, sul Mini: launchctl bootstrap {amb.dominio} "
                f"{amb.installati / (a + '.plist')}"
            )
            continue
        if esito.livello != OK:
            verde = False
        out.di(f"   {esito.livello:<5} {a} caricato: {descrivi(agente)}; {esito.testo}")
    if verde:
        out.di("VERDE  ogni LaunchAgent e caricato e verificato")
        return 0
    out.di("ROSSO  il riavvio dei LaunchAgent non e verde: vedi le righe qui sopra")
    return 1


def riavvia(amb: Ambiente, agenti: list[str]) -> int:
    """Steps 1 to 7 on the agents, in their order: the exit code."""
    out = Uscita(amb.scrivi)
    out.di("== RIAVVIO DEI LAUNCHAGENT: " + " ".join(agenti) + " ==")
    try:
        preparati = prepara(amb, out, agenti)
    except Exception as exc:
        out.di(f"ROSSO  lettura dei plist interrotta, {type(exc).__name__}: {exc}: nessun LaunchAgent riavviato")
        preparati = None
    esiti = {}
    scaricato = None
    for a in agenti:
        if preparati is None:
            esiti[a] = Esito(ROSSO, "non riavviato: vedi il ROSSO dei plist qui sopra")
            continue
        if scaricato is not None:
            out.di(f"   {a}: nessun comando, perche {scaricato} e SCARICATO")
            esiti[a] = Esito(ROSSO, f"non riavviato, perche {scaricato} e SCARICATO")
            continue
        try:
            esiti[a] = riavvia_agente(amb, out, a, *preparati[a])
        except Exception as exc:
            esiti[a] = Esito(ROSSO, f"riavvio interrotto da un errore, {type(exc).__name__}: {exc}")
        if not leggi_agente(amb, a).caricato:
            scaricato = a
    return rapporto(amb, out, agenti, esiti)


def main(argv: list[str] | None = None, ambiente: Ambiente | None = None) -> int:
    ignora_segnali()
    ap = argparse.ArgumentParser(description="Il riavvio dei LaunchAgent del deploy, sul Mini.")
    ap.add_argument("agenti", nargs="+", help="le etichette di AGENTI di deploy/deploy-mini.sh, nel loro ordine")
    args = ap.parse_args(argv)
    for a in args.agenti:
        if not _ETICHETTA.match(a):
            ap.error(f"etichetta non ammessa: {a!r}")
    if len(set(args.agenti)) != len(args.agenti):
        ap.error("etichetta ripetuta")
    return riavvia(ambiente if ambiente is not None else del_mini(), args.agenti)


if __name__ == "__main__":
    sys.exit(main())
