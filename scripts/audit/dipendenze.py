#!/usr/bin/env python3
"""PharmaTimer -- DIPENDENZE: un venv contro backend/requirements.lock.

Uso:  backend/venv/bin/python scripts/audit/dipendenze.py
          il venv che esegue lo script: e il blocco di make check;
      backend/venv/bin/python scripts/audit/dipendenze.py --freeze FILE
          un pip freeze preso altrove: make prod-check lo legge dal Mini.

Il lock e la sola fonte delle versioni di esercizio: scripts/genera-lock.py lo
genera dal report di una risoluzione, deploy/installa-dal-lock.sh lo installa
in modalita hash sullo Studio e sul Mini. Qui si misura che un venv lo porti:
ogni voce installata alla versione del lock. I pacchetti in piu -- sullo
Studio gli strumenti di sviluppo -- sono ammessi e si stampano come INFO.

Esiti, tutti nominati:
  VERDE  ogni voce del lock e installata alla sua versione;
  ROSSO  una voce manca, o e installata a un altra versione;
  ROSSO  il lock o il freeze non si leggono, o sono vuoti: senza le due
         misure il confronto non esiste.

Il confronto e sulle versioni. Gli hash li verifica pip all installazione:
un pacchetto gia presente pip lo salta senza rileggerne l artefatto, e dal
venv lo sha256 dell artefatto non si ricava.
"""
import argparse
import importlib.metadata
import os
import re
import sys

RADICE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOCK = os.path.join(RADICE, "backend", "requirements.lock")


class NonMisurabile(Exception):
    """Il lock o il freeze non si leggono: il confronto non esiste."""


def canonico(nome):
    return re.sub(r"[-_.]+", "-", nome).lower()


def leggi_lock(testo):
    """{nome canonico: versione}. Una riga che non sia nome==versione e NonMisurabile."""
    voci = {}
    for n, riga in enumerate(testo.splitlines(), 1):
        riga = riga.strip()
        if not riga or riga.startswith("#"):
            continue
        m = re.match(r"^([A-Za-z0-9][A-Za-z0-9._-]*)==([^\s;]+)(\s|$)", riga)
        if not m:
            raise NonMisurabile("riga %d del lock illeggibile: %r" % (n, riga[:60]))
        voci[canonico(m.group(1))] = m.group(2)
    if not voci:
        raise NonMisurabile("il lock non porta voci")
    return voci


def leggi_freeze(testo):
    """{nome canonico: versione} da un pip freeze; le righe -e e i commenti si saltano.

    Un pacchetto installato da URL (nome @ url) non porta la versione: vale
    None, e contro il lock e una versione diversa.
    """
    voci = {}
    for riga in testo.splitlines():
        riga = riga.strip()
        if not riga or riga.startswith(("#", "-e ", "--")):
            continue
        if " @ " in riga:
            voci[canonico(riga.split(" @ ", 1)[0])] = None
            continue
        m = re.match(r"^([A-Za-z0-9][A-Za-z0-9._-]*)==(\S+)$", riga)
        if not m:
            raise NonMisurabile("riga del freeze illeggibile: %r" % riga[:60])
        voci[canonico(m.group(1))] = m.group(2)
    if not voci:
        raise NonMisurabile("il freeze non porta voci")
    return voci


def installati():
    """{nome canonico: versione} del venv che esegue lo script."""
    return {canonico(d.metadata["Name"]): d.version for d in importlib.metadata.distributions()}


def confronta(lock, presenti):
    """(mancanti, diverse, in_piu), ordinate. diverse = [(nome, lock, installata)]."""
    mancanti = sorted(n for n in lock if n not in presenti)
    diverse = sorted((n, lock[n], presenti[n]) for n in lock
                     if n in presenti and presenti[n] != lock[n])
    in_piu = sorted(n for n in presenti if n not in lock)
    return mancanti, diverse, in_piu


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--freeze", help="un pip freeze da confrontare al posto del venv")
    args = ap.parse_args()
    fonte = "freeze " + args.freeze if args.freeze else "venv " + os.path.relpath(sys.prefix, RADICE)
    print("== DIPENDENZE: backend/requirements.lock contro il %s ==" % fonte)
    try:
        with open(LOCK, encoding="utf-8") as fh:
            lock = leggi_lock(fh.read())
        if args.freeze:
            with open(args.freeze, encoding="utf-8") as fh:
                presenti = leggi_freeze(fh.read())
        else:
            presenti = installati()
    except (OSError, UnicodeDecodeError, NonMisurabile) as exc:
        print("   ROSSO non misurabile: %s" % exc)
        return 1
    mancanti, diverse, in_piu = confronta(lock, presenti)
    for nome in mancanti:
        print("   ROSSO manca %s==%s" % (nome, lock[nome]))
    for nome, atteso, trovato in diverse:
        print("   ROSSO %s: nel lock %s, installato %s" % (nome, atteso, trovato))
    if in_piu:
        print("   INFO  in piu, ammessi: %s" % ", ".join(in_piu))
    if mancanti or diverse:
        print("   ROSSO %d voci del lock su %d non corrispondono"
              % (len(mancanti) + len(diverse), len(lock)))
        return 1
    print("   VERDE %d voci su %d alla versione del lock" % (len(lock), len(lock)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
