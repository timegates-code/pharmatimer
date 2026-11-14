"""
PharmaTimer -- the state of a LaunchAgent as `launchctl print` tells it.

The one seat of that reading, for every tool that needs it: make
prod-check, through scripts/audit/servizi_mini.py, on the text ssh brings
back from the Mini; and the restart of the deploy, deploy/riavvia_agenti.py,
part 1 of the fermo visibile (decision 1 of Roberto, 2026-11-13 at 21:41),
on the Mini itself. It lives in deploy/ because deploy/ reaches the Mini and
scripts/ does not.

Pure: no process, no launchctl, no I/O, standard library only, for the Mini's
python as for the Studio's. The input is the output of
`launchctl print gui/<uid>/<label>` and that command's exit code: 0 when the
service is loaded in the domain, anything else when it is not.

The fields of the service sit on lines indented by ONE tab. Nested blocks
repeat names such as "state" on lines indented by two tabs, and never count.
The form, as Roberto's reading of the Mini measured it on 2026-11-11 after
the reboot of that day, a grep of these fields:

    <tab>state = running
    <tab>runs = 1
    <tab>pid = 3338
    <tab>last exit code = (never exited)
    <tab><tab>state = active

Its pins: backend/tests/test_stato_agenti.py, for the reason CLAUDE.md 13
gives for the scripts of the gate.

No `from __future__ import annotations`: with it, a dataclass looks its module
up in sys.modules, and a module loaded by its path, as prod-check and the
tests load this one, is not there.
"""
import re
from dataclasses import dataclass

IN_ESECUZIONE = "running"
# A job between two runs: the restart waits for it before a bootout.
NON_IN_ESECUZIONE = "not running"
MAI_USCITO = "(never exited)"

# One tab, then a field of the service: never two tabs.
_CAMPO = re.compile(r"^\t(state|pid|runs|last exit code) = (.*?)\s*$")


@dataclass(frozen=True)
class Agente:
    """One LaunchAgent. caricato: launchctl print found it in the domain.

    ultima_uscita is "last exit code" as launchctl prints it: "0", "1",
    "(never exited)"; None when it does not read. pid and runs are None when
    absent or not a number.
    """

    etichetta: str
    caricato: bool
    state: str | None = None
    pid: int | None = None
    runs: int | None = None
    ultima_uscita: str | None = None

    @property
    def in_esecuzione(self) -> bool:
        return self.state == IN_ESECUZIONE


def _intero(testo: str | None) -> int | None:
    return int(testo) if testo is not None and testo.isdigit() else None


def leggi(etichetta: str, testo: str, codice: int) -> Agente:
    """The Agente from the output and the exit code of launchctl print.

    Of each field the first line with one tab counts; a field that is not
    there stays None, and the caller judges what a missing field means.
    """
    if codice != 0:
        return Agente(etichetta, False)
    campi: dict[str, str] = {}
    for riga in testo.splitlines():
        trovato = _CAMPO.match(riga)
        if trovato and trovato.group(1) not in campi:
            campi[trovato.group(1)] = trovato.group(2)
    return Agente(
        etichetta,
        True,
        state=campi.get("state"),
        pid=_intero(campi.get("pid")),
        runs=_intero(campi.get("runs")),
        ultima_uscita=campi.get("last exit code"),
    )
