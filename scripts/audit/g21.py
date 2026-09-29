#!/usr/bin/env python3
"""PharmaTimer -- G-21: livello di migrazione RICHIESTO dal codice contro APPLICATO sul Mini.

Uso:  backend/venv/bin/python scripts/audit/g21.py --mysql '<client mysql del Mini>' --db <db>
      e la ricetta di `make g21`, che passa MINI_MYSQL e il nome del DB.

Tocca il Mini in SOLA LETTURA, via ssh: una SELECT su information_schema.
Non gira dentro il sandbox di Claude Code, come prod-check: da li risponde
NON MISURABILE, che e rosso.

Il livello richiesto e quello che l inventario gia calcola: la stessa funzione
che la voce 19 stampa (inventario.livello_richiesto). I marcatori del livello
si leggono dal suo .sql: tabelle create, colonne aggiunte, indici aggiunti, anche
quelli dentro un CREATE TABLE. Il Mini e al livello se li porta TUTTI.

Esiti, tutti nominati:
  VERDE  il Mini porta ogni marcatore del livello richiesto;
  VERDE  il codice non richiede alcuna migrazione oltre v01: nulla da confrontare;
  ROSSO  manca almeno un marcatore: schierare il codice senza migrare fallisce;
  ROSSO  il livello non ha marcatori misurabili (solo MODIFY COLUMN, per esempio);
  ROSSO  il Mini non e misurabile da qui: senza la misura del bersaglio il
         confronto non esiste.

Prima generazione, fino alla v07: la ricetta del Makefile stampava il livello
richiesto ma interrogava la sola colonna della v06, qualunque fosse il livello.
Con un livello v07 avrebbe risposto verde a un Mini senza la v07.
"""
import argparse
import os
import re
import shlex
import subprocess
import sys

RADICE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MIGRAZIONI = os.path.join("backend", "db", "migrations")

sys.path.insert(0, os.path.join(RADICE, "scripts", "audit"))
import inventario  # noqa: E402


def marcatori(percorso):
    """[(tipo, tabella, nome)] degli oggetti che la migrazione introduce."""
    with open(percorso, encoding="utf-8") as fh:
        testo = "\n".join(r for r in fh.read().splitlines() if not r.strip().startswith("--"))
    trovati = []
    for m in re.finditer(r"CREATE TABLE IF NOT EXISTS (\w+)\s*\((.*?)\)\s*ENGINE", testo, re.S | re.I):
        tab = m.group(1)
        trovati.append(("tabella", tab, tab))
        trovati += [("indice", tab, i)
                    for i in re.findall(r"^\s*(?:UNIQUE\s+)?INDEX\s+(\w+)", m.group(2), re.M | re.I)]
    piatto = re.sub(r"\s+", " ", testo)
    trovati += [("colonna", t, c)
                for t, c in re.findall(r"ALTER TABLE (\w+) ADD COLUMN (\w+)", piatto, re.I)]
    trovati += [("indice", t, i)
                for t, i in re.findall(r"ALTER TABLE (\w+) ADD (?:UNIQUE )?INDEX (\w+)", piatto, re.I)]
    return trovati


def interrogazione(marks):
    """Una SELECT per marcatore, riunite: etichetta e conteggio. I nomi sono \\w+."""
    parti = []
    for tipo, tab, nome in marks:
        if tipo == "tabella":
            parti.append("SELECT 'tabella %s', COUNT(*) FROM information_schema.TABLES "
                         "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='%s'" % (tab, tab))
        elif tipo == "colonna":
            parti.append("SELECT 'colonna %s.%s', COUNT(*) FROM information_schema.COLUMNS "
                         "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='%s' AND COLUMN_NAME='%s'"
                         % (tab, nome, tab, nome))
        else:
            parti.append("SELECT 'indice %s.%s', COUNT(*) FROM information_schema.STATISTICS "
                         "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='%s' AND INDEX_NAME='%s'"
                         % (tab, nome, tab, nome))
    return " UNION ALL ".join(parti)


def leggi_mini(mysql, db, sql):
    """[(etichetta, conteggio)] dal Mini, o (None, motivo) se non misurabile."""
    remoto = "%s %s -N -B -e %s" % (mysql, shlex.quote(db), shlex.quote(sql))
    try:
        p = subprocess.run(["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", "mini", remoto],
                           capture_output=True, text=True, timeout=90)
    except (OSError, subprocess.TimeoutExpired) as exc:
        return None, str(exc)
    if p.returncode != 0:
        return None, (p.stderr.strip().splitlines() or ["exit %d" % p.returncode])[-1][:120]
    letti = []
    for riga in p.stdout.strip().splitlines():
        parti = riga.split("\t")
        if len(parti) != 2 or not parti[1].isdigit():
            return None, "risposta illeggibile: %r" % riga[:80]
        letti.append((parti[0], int(parti[1])))
    return letti, None


def applicatore_prod(livello):
    ver = livello.split("_")[0]
    trovati = sorted(f for f in os.listdir(MIGRAZIONI) if f.startswith("apply_" + ver) and "prod" in f)
    return os.path.join(MIGRAZIONI, trovati[0]) if trovati else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mysql", required=True, help="client mysql del Mini, con il suo defaults-file")
    ap.add_argument("--db", required=True)
    args = ap.parse_args()
    os.chdir(RADICE)
    print("== G-21: livello di migrazione RICHIESTO dal codice contro APPLICATO sul Mini ==")
    livello = inventario.livello_richiesto()
    if livello is None:
        print("   richiesto dal codice : nessuna migrazione oltre v01")
        print("   OK    nulla da confrontare")
        return 0
    marks = marcatori(os.path.join(MIGRAZIONI, livello))
    print("   richiesto dal codice : %s (%d marcatori)" % (livello, len(marks)))
    if not marks:
        print("   ROSSO il livello richiesto non ha marcatori misurabili: il confronto non esiste.")
        return 1
    letti, motivo = leggi_mini(args.mysql, args.db, interrogazione(marks))
    if letti is None or len(letti) != len(marks):
        print("   applicato sul Mini   : NON MISURABILE (%s)"
              % (motivo or "attesi %d marcatori, letti %d" % (len(marks), len(letti))))
        print("   ROSSO senza la misura del bersaglio il confronto non esiste.")
        return 1
    mancanti = [etichetta for etichetta, n in letti if n < 1]
    if not mancanti:
        print("   applicato sul Mini   : %s PRESENTE, %d marcatori su %d"
              % (livello, len(letti), len(marks)))
        print("   OK    livelli compatibili")
        return 0
    print("   applicato sul Mini   : %s ASSENTE, mancano %d marcatori su %d: %s"
          % (livello, len(mancanti), len(marks), "; ".join(mancanti)))
    print("   ROSSO il Mini e SOTTO il livello richiesto dal codice.")
    print("         Schierare senza migrare fa fallire ogni richiesta che nomina un oggetto mancante.")
    appl = applicatore_prod(livello)
    print("         Ordine vincolante: %s PRIMA, codice DOPO."
          % (appl or "l applicatore di produzione del livello (ASSENTE da questa cartella)"))
    return 1


if __name__ == "__main__":
    sys.exit(main())
