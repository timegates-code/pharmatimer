#!/usr/bin/env python3
"""PharmaTimer -- i servizi del Mini per make prod-check: LaunchAgent, battito della passata, monitor.

Uso:  backend/venv/bin/python scripts/audit/servizi_mini.py --mysql '<client mysql del Mini>' --db <db>
      e la riga della ricetta di `make prod-check`, che passa MINI_MYSQL e il nome del DB.

Parte 2 del fermo visibile, decisioni di Roberto del 2026-11-13 (20:58 e
21:41). Tocca il Mini in SOLA LETTURA, via ssh in BatchMode come g21.py, con
tre letture:
  1. `launchctl print` dei LaunchAgent che deploy/deploy-mini.sh installa, la
     sua variabile AGENTI, letto da deploy/stato_agenti.py, la sede unica
     della lettura di launchctl. Quale deve essere sempre in esecuzione lo
     dice il suo plist in git: KeepAlive;
  2. il battito della passata, la riga del pianificatore in
     push_pianificatore: esito ed eta, con l eta sull orologio del Mini come
     fa /api/push/stato;
  3. la riga MONITOR_URL del .env.dev del Mini, quello della cartella di
     lavoro dei due plist (config.py): due conteggi di grep, mai il valore,
     che non esce dal Mini (decisione 1).
Non gira dentro il sandbox di Claude Code, come prod-check: da li ogni
lettura e non misurabile, che e rosso.

Esiti, uno per riga:
  OK     un LaunchAgent caricato: con KeepAlive in esecuzione, senza con
         l ultima uscita 0 o mai uscito;
  ROSSO  un LaunchAgent non caricato, uno con KeepAlive non in esecuzione,
         uno senza KeepAlive uscito con un codice diverso da 0, uno che non
         si legge, o la lettura fallita;
  OK     il battito con esito ok, di non piu di SOGLIA_BATTITO_S fa;
  ROSSO  il battito assente, piu vecchio, con esito diverso da ok, o la
         lettura fallita;
  OK     MONITOR configurato: una riga MONITOR_URL con un indirizzo https;
  INFO   MONITOR non configurato: il battito non parte. Scelta 5 B: lo dice
         e non ferma il deploy, perche la riga puo arrivare dopo il codice;
  ROSSO  due o piu righe MONITOR_URL, una che non porta un indirizzo https,
         o la lettura fallita.
Non stampa mai la configurazione, ne il dettaglio del battito.

Uscita 0 senza ROSSO, 1 altrimenti. I pin: backend/tests/test_servizi_mini.py.
"""
from __future__ import annotations

import argparse
import importlib.util
import os
import plistlib
import re
import shlex
import subprocess
import sys

RADICE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEPLOY_MINI = os.path.join(RADICE, "deploy", "deploy-mini.sh")
LAUNCHD = os.path.join(RADICE, "deploy", "launchd")

_SPEC = importlib.util.spec_from_file_location(
    "stato_agenti", os.path.join(RADICE, "deploy", "stato_agenti.py")
)
stato_agenti = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(stato_agenti)

OK = "OK"
INFO = "INFO"
ROSSO = "ROSSO"

# La soglia del battito vecchio, decisione 33 B: la stessa di SOGLIA_BATTITO_MS
# in src/domain/statoCanale.js, che un test tiene uguale.
SOGLIA_BATTITO_S = 300
# La riga del pianificatore in push_pianificatore: canale.NOME_PIANIFICATORE,
# che un test tiene uguale.
NOME_PIANIFICATORE = "pianificatore"
SQL_BATTITO = (
    "SELECT esito, UNIX_TIMESTAMP() * 1000 - ultima_passata_ms "
    "FROM push_pianificatore WHERE nome = '%s'" % NOME_PIANIFICATORE
)
# Il .env.dev del Mini: config.py lo legge dalla cartella di lavoro, che per i
# due plist e ~/PharmaTimer/backend. La tilde la espande il Mini.
ENV_MINI = "~/PharmaTimer/backend/.env.dev"
# La riga del monitor, letta come la legge pydantic-settings: spazi in testa,
# export, spazi intorno all uguale, virgolette.
RE_CHIAVE = r"^[[:space:]]*(export[[:space:]]+)?MONITOR_URL[[:space:]]*="
RE_HTTPS = RE_CHIAVE + r"""[[:space:]]*["']?https://"""

SSH = ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", "mini"]
_ETICHETTA = re.compile(r"^[A-Za-z0-9._-]+$")


def agenti_del_deploy(testo: str) -> list[str]:
    """I LaunchAgent che deploy-mini.sh installa e riavvia: la sua variabile AGENTI."""
    trovata = re.search(r'^AGENTI="([^"]+)"', testo, re.M)
    if trovata is None:
        raise ValueError("AGENTI non si legge in deploy/deploy-mini.sh")
    agenti = trovata.group(1).split()
    for a in agenti:
        if not _ETICHETTA.match(a):
            raise ValueError("etichetta non ammessa in AGENTI: %r" % a)
    return agenti


def sempre_vivo(plist: dict) -> bool:
    """Un LaunchAgent che deve essere sempre in esecuzione: KeepAlive nel suo plist."""
    return plist.get("KeepAlive") is True


def comando_launchctl(agenti: list[str]) -> str:
    """Il comando del Mini: per ogni agente un marcatore, launchctl print, il suo codice."""
    return (
        "for a in %s; do echo \"== agente $a\"; launchctl print \"gui/$(id -u)/$a\" 2>&1; "
        "echo \"== uscita $?\"; done" % " ".join(agenti)
    )


def leggi_blocchi(uscita: str) -> dict[str, tuple[str, int]]:
    """{etichetta: (testo di launchctl print, codice)}, dai marcatori del comando."""
    blocchi: dict[str, tuple[str, int]] = {}
    corrente = None
    righe: list[str] = []
    for riga in uscita.splitlines():
        if riga.startswith("== agente "):
            corrente, righe = riga[len("== agente "):], []
        elif riga.startswith("== uscita ") and corrente is not None:
            codice = riga[len("== uscita "):].strip()
            blocchi[corrente] = ("\n".join(righe), int(codice) if codice.isdigit() else -1)
            corrente = None
        elif corrente is not None:
            righe.append(riga)
    return blocchi


def comando_monitor() -> str:
    """Il comando del Mini: due conteggi di grep sul .env.dev, ciascuno col suo codice."""
    return (
        "f=%s; grep -cE %s \"$f\"; echo \"== uscita $?\"; grep -cE %s \"$f\"; echo \"== uscita $?\""
        % (ENV_MINI, shlex.quote(RE_CHIAVE), shlex.quote(RE_HTTPS))
    )


def leggi_conteggi(uscita: str) -> tuple[int, int] | None:
    """(righe MONITOR_URL, righe con https), o None se grep non ha contato."""
    righe = [r.strip() for r in uscita.splitlines() if r.strip()]
    if len(righe) != 4:
        return None
    (n1, u1, n2, u2) = righe
    if u1 not in ("== uscita 0", "== uscita 1") or u2 not in ("== uscita 0", "== uscita 1"):
        return None
    if not (n1.isdigit() and n2.isdigit()):
        return None
    return int(n1), int(n2)


def giudica_agente(agente, deve_girare: bool) -> tuple[str, str]:
    """(livello, testo) di un LaunchAgent."""
    a = agente.etichetta
    if not agente.caricato:
        return ROSSO, (
            "%s NON CARICATO: sul Mini, launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/%s.plist"
            % (a, a)
        )
    campi = "state = %s, pid %s, runs %s, last exit code = %s" % (
        agente.state, agente.pid, agente.runs, agente.ultima_uscita)
    if agente.state is None:
        return ROSSO, "%s caricato, ma il suo stato non si legge: %s" % (a, campi)
    if deve_girare:
        if not agente.in_esecuzione:
            return ROSSO, "%s caricato ma non in esecuzione: %s" % (a, campi)
        return OK, "%s caricato e in esecuzione: %s" % (a, campi)
    if agente.ultima_uscita not in ("0", stato_agenti.MAI_USCITO):
        return ROSSO, "%s caricato, ma la sua ultima uscita non e 0: %s" % (a, campi)
    return OK, "%s caricato: %s" % (a, campi)


def giudica_battito(riga: tuple[str, int] | None) -> tuple[str, str]:
    """(livello, testo) del battito: la riga (esito, eta_ms), o None se la passata non l ha mai scritta."""
    if riga is None:
        return ROSSO, "BATTITO assente: la passata non ha mai scritto la sua riga"
    esito, eta_ms = riga
    eta_s = max(0, eta_ms) // 1000
    testo = "esito %s, %d s fa (soglia %d s)" % (esito, eta_s, SOGLIA_BATTITO_S)
    if esito != "ok" or eta_s > SOGLIA_BATTITO_S:
        return ROSSO, "BATTITO " + testo
    return OK, "BATTITO " + testo


def giudica_monitor(conteggi: tuple[int, int] | None) -> tuple[str, str]:
    """(livello, testo) della riga del monitor, dai due conteggi: mai il valore."""
    if conteggi is None:
        return ROSSO, "MONITOR: la riga MONITOR_URL di %s non si legge" % ENV_MINI
    chiave, https = conteggi
    if chiave == 0:
        return INFO, "MONITOR non configurato: il battito non parte"
    if chiave > 1:
        return ROSSO, "MONITOR: %d righe MONITOR_URL in %s, ne serve una sola" % (chiave, ENV_MINI)
    if https != 1:
        return ROSSO, "MONITOR: la riga MONITOR_URL di %s non porta un indirizzo https" % ENV_MINI
    return OK, "MONITOR configurato: una riga MONITOR_URL con un indirizzo https"


def _ssh(remoto: str) -> tuple[int | None, str, str]:
    """(codice, stdout, stderr) di un comando sul Mini; codice None se ssh non parte."""
    try:
        p = subprocess.run([*SSH, remoto], capture_output=True, text=True, timeout=90)
    except (OSError, subprocess.TimeoutExpired) as exc:
        return None, "", str(exc)
    return p.returncode, p.stdout, p.stderr


def _motivo(codice, errore: str) -> str:
    righe = errore.strip().splitlines()
    return (righe[-1] if righe else "uscita %s" % codice)[:120]


def leggi_agenti(agenti: list[str], esegui) -> tuple[dict | None, str | None]:
    codice, uscita, errore = esegui(comando_launchctl(agenti))
    if codice != 0:
        return None, _motivo(codice, errore)
    blocchi = leggi_blocchi(uscita)
    mancanti = [a for a in agenti if a not in blocchi]
    if mancanti:
        return None, "risposta illeggibile, manca " + ", ".join(mancanti)
    return {a: stato_agenti.leggi(a, *blocchi[a]) for a in agenti}, None


def leggi_battito(mysql: str, db: str, esegui) -> tuple[tuple[str, int] | None, str | None]:
    """(riga, None), (None, None) se la riga non c e, (None, motivo) se la lettura fallisce."""
    codice, uscita, errore = esegui("%s %s -N -B -e %s" % (mysql, shlex.quote(db), shlex.quote(SQL_BATTITO)))
    if codice != 0:
        return None, _motivo(codice, errore)
    righe = [r for r in uscita.splitlines() if r.strip()]
    if not righe:
        return None, None
    parti = righe[0].split("\t")
    if len(righe) != 1 or len(parti) != 2 or not re.fullmatch(r"-?\d+", parti[1].strip()):
        return None, "risposta illeggibile: %r" % righe[0][:80]
    return (parti[0], int(parti[1])), None


def leggi_monitor(esegui) -> tuple[tuple[int, int] | None, str | None]:
    codice, uscita, errore = esegui(comando_monitor())
    if codice != 0:
        return None, _motivo(codice, errore)
    conteggi = leggi_conteggi(uscita)
    if conteggi is None:
        return None, _motivo(codice, errore or "grep non ha contato")
    return conteggi, None


def main(argv=None, esegui=_ssh) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mysql", required=True, help="client mysql del Mini, con il suo defaults-file")
    ap.add_argument("--db", required=True)
    args = ap.parse_args(argv)

    print("== SERVIZI DEL MINI: LaunchAgent, battito della passata, monitor ==")
    esiti: list[tuple[str, str]] = []
    try:
        with open(DEPLOY_MINI, encoding="utf-8") as fh:
            agenti = agenti_del_deploy(fh.read())
        vivi = {}
        for a in agenti:
            with open(os.path.join(LAUNCHD, a + ".plist"), "rb") as fh:
                vivi[a] = sempre_vivo(plistlib.load(fh))
    except (OSError, ValueError) as exc:
        agenti = None
        esiti.append((ROSSO, "LAUNCHAGENT: l elenco o un plist del repo non si legge: %s" % exc))
    if agenti is not None:
        letti, motivo = leggi_agenti(agenti, esegui)
        if letti is None:
            esiti.append((ROSSO, "LAUNCHAGENT non misurabili dal Mini: %s" % motivo))
        else:
            esiti.extend(giudica_agente(letti[a], vivi[a]) for a in agenti)

    riga, motivo = leggi_battito(args.mysql, args.db, esegui)
    if motivo is not None:
        esiti.append((ROSSO, "BATTITO non misurabile dal Mini: %s" % motivo))
    else:
        esiti.append(giudica_battito(riga))

    conteggi, motivo = leggi_monitor(esegui)
    if motivo is not None:
        esiti.append((ROSSO, "MONITOR: la riga MONITOR_URL di %s non si legge: %s" % (ENV_MINI, motivo)))
    else:
        esiti.append(giudica_monitor(conteggi))

    for livello, testo in esiti:
        print("   %-5s %s" % (livello, testo))
    return 1 if any(livello == ROSSO for livello, _ in esiti) else 0


if __name__ == "__main__":
    sys.exit(main())
