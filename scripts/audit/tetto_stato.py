#!/usr/bin/env python3
"""PharmaTimer -- il tetto di STATO_CORRENTE.md.

Uso:  python3 scripts/audit/tetto_stato.py

Decisione 1 del 2026-10-24: lo STATO ha al massimo RIGHE_MAX righe e nessuna
riga supera COLONNE_MAX caratteri. I caratteri sono punti di codice UTF-8, non
byte: una lettera accentata conta uno. Le righe sono quelle di splitlines(),
la stessa misura con cui la decisione e stata presa.

GIUDICA, a differenza del contatore, che registra e non giudica (CLAUDE.md 4):
per questo sta in un blocco suo. Prima dello STATO misura il proprio campione,
ai due lati di ciascun tetto: uno strumento che non arrossa sul campione non
puo dare un verde.

Uscita 0 se l'autoprova passa e lo STATO sta nel tetto, 1 altrimenti.
"""
import os
import sys

RADICE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STATO = os.path.join(RADICE, "STATO_CORRENTE.md")
RIGHE_MAX = 150
COLONNE_MAX = 80


def misura(testo):
    """Rende (righe, oltre): quante righe, e (numero, lunghezza) di quelle oltre COLONNE_MAX."""
    righe = testo.splitlines()
    return len(righe), [(n, len(r)) for n, r in enumerate(righe, 1) if len(r) > COLONNE_MAX]


def dentro(testo):
    righe, oltre = misura(testo)
    return righe <= RIGHE_MAX and not oltre


# Il campione: ogni tetto al suo valore e un passo oltre. La riga al tetto e di
# lettere accentate, scritte come escape: in byte sarebbe lunga il doppio, e un
# conteggio in byte la darebbe fuori.
CAMPIONE = [
    ("x\n" * RIGHE_MAX, True, f"{RIGHE_MAX} righe"),
    ("x\n" * (RIGHE_MAX + 1), False, f"{RIGHE_MAX + 1} righe"),
    ("à" * COLONNE_MAX + "\n", True, f"una riga di {COLONNE_MAX} caratteri accentati"),
    ("a" * (COLONNE_MAX + 1) + "\n", False, f"una riga di {COLONNE_MAX + 1} caratteri"),
]


def autoprova():
    """Rende la lista dei difetti dello strumento sul campione; vuota se sano."""
    esito = {True: "dentro", False: "fuori"}
    return [f"{nome}: {esito[dentro(testo)]}, atteso {esito[atteso]}"
            for testo, atteso, nome in CAMPIONE if dentro(testo) != atteso]


def main():
    print(f"== TETTO STATO: al massimo {RIGHE_MAX} righe, nessuna oltre {COLONNE_MAX} caratteri ==")
    difetti = autoprova()
    if difetti:
        print("ROSSO  autoprova del tetto fallita: lo strumento non misura come dichiara")
        for d in difetti:
            print(f"         {d}")
        return 1
    print(f"   OK    autoprova: {RIGHE_MAX} righe dentro e {RIGHE_MAX + 1} fuori,"
          f" {COLONNE_MAX} caratteri accentati dentro e {COLONNE_MAX + 1} fuori")
    try:
        with open(STATO, encoding="utf-8") as f:
            testo = f.read()
    except (OSError, UnicodeDecodeError) as e:
        print(f"ROSSO  STATO illeggibile: {e}")
        return 1
    righe, oltre = misura(testo)
    rc = 0
    if righe > RIGHE_MAX:
        print(f"   ROSSO STATO_CORRENTE.md: {righe} righe, oltre il tetto di {RIGHE_MAX}")
        rc = 1
    for n, lunghezza in oltre:
        print(f"   ROSSO STATO_CORRENTE.md:{n}: {lunghezza} caratteri, oltre il tetto di {COLONNE_MAX}")
        rc = 1
    if rc == 0:
        massima = max((len(r) for r in testo.splitlines()), default=0)
        print(f"   OK    STATO_CORRENTE.md: {righe} righe su {RIGHE_MAX},"
              f" la piu lunga di {massima} caratteri su {COLONNE_MAX}")
    return rc


if __name__ == "__main__":
    sys.exit(main())
