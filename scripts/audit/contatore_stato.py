#!/usr/bin/env python3
"""PharmaTimer -- contatore delle voci aperte e chiuse di STATO_CORRENTE.md.

Uso:  python3 scripts/audit/contatore_stato.py [--scrivi si|no]
      --scrivi si   (default) appende una riga datata a docs/serie-stato.tsv
                    SE i conteggi differiscono dall'ultima riga della serie.
      --scrivi no   conta e stampa, non scrive mai: e la forma di
                    check-prepush e check-ci, dove scrivere sporcherebbe TREE.

NON GIUDICA: REGISTRA. Nessun conteggio fa arrossare il blocco. Arrossa solo
lo strumento: l'autoprova in testa a ogni esecuzione, o lo STATO o il file
delle chiuse illeggibile.

LA NORMA (CLAUDE.md sezione 4). Una voce e SOLO una riga che porta il tag
`[aperta]` o `[chiusa]` subito dopo il marcatore di lista (`- `, `* `, `12. `)
o subito dopo la prima cella di una riga di tabella (`| 1 | [aperta] ...`).
La sezione e l'ultima intestazione `##` o `###` sopra la voce. Tutto il resto
non e una voce, qualunque forma abbia: gli elenchi del verbale non si contano.
Un tag trovato fuori da quella posizione si stampa come INFO e non si conta.
Il tag e binario: cio che non e chiuso per intero e `[aperta]`.

LE CHIUSE (decisione 3 del 2026-10-24). Una voce chiusa esce dallo STATO ed
entra in docs/chiuse-stato.tsv: una riga per voce, la sezione nel primo campo,
separato da TAB; commenti (#) e righe vuote non sono voci, una riga senza
sezione si stampa come INFO e non si conta. Una sezione somma le voci dello
STATO e le righe del file; l'ordine e quello dello STATO, poi le sezioni del
solo file nell'ordine del file. Un [chiusa] ancora nello STATO si conta come
prima, e si stampa come INFO: la sua sede e il file delle chiuse.

LA SERIE registra i CAMBIAMENTI dello STATO e delle chiuse, non le esecuzioni
del gate: una riga si appende solo a conteggio cambiato, data esclusa dal
confronto. Cosi all'apertura l'albero resta pulito per costruzione, e la riga
entra nello stesso commit che cambia lo STATO. Una voce chiusa che passa dallo
STATO al file delle chiuse resta nel conteggio: la serie e cumulativa.

Uscita 0 se l'autoprova passa e i due file si leggono, 1 altrimenti.
"""
import datetime
import os
import re
import sys

RADICE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STATO = os.path.join(RADICE, "STATO_CORRENTE.md")
CHIUSE = os.path.join(RADICE, "docs", "chiuse-stato.tsv")
SERIE = os.path.join(RADICE, "docs", "serie-stato.tsv")

INTESTAZIONE_SERIE = """\
# PharmaTimer -- serie delle voci di STATO_CORRENTE.md, generata da make check.
# Scritta da scripts/audit/contatore_stato.py: non si edita a mano.
# Registra i CAMBIAMENTI dello STATO, non le esecuzioni del gate: una riga si
# appende solo quando i conteggi differiscono dall'ultima, data esclusa.
# Conta le voci dello STATO e le chiuse di docs/chiuse-stato.tsv: e cumulativa.
# Campi, separati da TAB: data, aperte, chiuse, poi sezione=aperte/chiuse
# nell'ordine in cui le sezioni compaiono nello STATO.
"""

TAG = r"\[(aperta|chiusa)\]"
VOCE_LISTA = re.compile(r"^\s*(?:[-*]|\d+\.)\s+" + TAG)
VOCE_TABELLA = re.compile(r"^\|[^|]*\|\s*" + TAG)
QUALUNQUE_TAG = re.compile(TAG)
SEZIONE = re.compile(r"^#{2,3}\s+(.+?)\s*$")
RECINTO = re.compile(r"^\s*```")


def conta(testo):
    """Rende (sezioni, fuori_posizione).

    sezioni: lista ordinata di [nome, aperte, chiuse], solo quelle con voci.
    fuori_posizione: lista di (numero di riga, riga) con un tag non in testa.
    """
    sezioni, indice, fuori = [], {}, []
    corrente = "(prima di ogni sezione)"
    in_recinto = False
    for n, riga in enumerate(testo.splitlines(), 1):
        if RECINTO.match(riga):
            in_recinto = not in_recinto
            continue
        if in_recinto:
            continue
        m = SEZIONE.match(riga)
        if m:
            corrente = m.group(1)
            continue
        m = VOCE_LISTA.match(riga) or VOCE_TABELLA.match(riga)
        if m:
            if corrente not in indice:
                indice[corrente] = [corrente, 0, 0]
                sezioni.append(indice[corrente])
            indice[corrente][1 if m.group(1) == "aperta" else 2] += 1
        elif QUALUNQUE_TAG.search(riga):
            fuori.append((n, riga.strip()))
    return sezioni, fuori


def conta_chiuse(testo):
    """Rende (sezioni, senza_sezione) del file delle chiuse.

    sezioni: lista ordinata di [nome, 0, chiuse], nella forma di conta().
    senza_sezione: lista di (numero di riga, riga) senza sezione nel primo campo.
    """
    sezioni, indice, senza = [], {}, []
    for n, riga in enumerate(testo.splitlines(), 1):
        if not riga.strip() or riga.startswith("#"):
            continue
        nome = riga.split("\t", 1)[0].strip() if "\t" in riga else ""
        if not nome:
            senza.append((n, riga.strip()))
            continue
        if nome not in indice:
            indice[nome] = [nome, 0, 0]
            sezioni.append(indice[nome])
        indice[nome][2] += 1
    return sezioni, senza


def unisci(stato, chiuse):
    """Somma per sezione: prima l'ordine dello STATO, poi le sezioni del solo file."""
    uniti, indice = [], {}
    for nome, aperte, chiuse_sezione in stato + chiuse:
        if nome not in indice:
            indice[nome] = [nome, 0, 0]
            uniti.append(indice[nome])
        indice[nome][1] += aperte
        indice[nome][2] += chiuse_sezione
    return uniti


def campi(sezioni):
    """I campi della riga di serie, data esclusa: sono cio che si confronta."""
    aperte = sum(s[1] for s in sezioni)
    chiuse = sum(s[2] for s in sezioni)
    return [f"aperte={aperte}", f"chiuse={chiuse}"] + [f"{s[0]}={s[1]}/{s[2]}" for s in sezioni]


def ultima_riga(path):
    """I campi dell'ultima riga di dati della serie, data esclusa; None se vuota."""
    if not os.path.exists(path):
        return None
    ultima = None
    with open(path, encoding="utf-8") as f:
        for riga in f:
            riga = riga.rstrip("\n")
            if riga and not riga.startswith("#"):
                ultima = riga.split("\t")[1:]
    return ultima


# Il campione dell'autoprova: voci aperte e chiuse in ciascuna delle due forme,
# in numero DIVERSO fra loro, perche con conteggi simmetrici uno scambio fra
# aperta e chiusa passerebbe inosservato (misurato: la prima versione lo
# taceva). Poi un tag fuori posizione, un elenco di verbale senza tag, un tag
# dentro un recinto di codice, e una sezione senza voci che non deve comparire.
CAMPIONE = """\
# Titolo
## Coda
| # | mancante |
|---|---|
| 1 | [aperta] prima |
| 2 | [chiusa] seconda |
## Verbale
1. atto del verbale, non e una voce
- conseguenza misurata, non e una voce
### Decisioni
1. [aperta] terza
12. [chiusa] quarta
- [aperta] quinta
   - [aperta] sesta, rientrata
7. **Titolo** [aperta] tag fuori posizione
```
- [aperta] dentro un recinto, non si conta
```
"""
ATTESO = [["Coda", 1, 1], ["Decisioni", 3, 1]]

# Il campione del file delle chiuse: un commento e una riga vuota che non sono
# voci, due sezioni dello STATO con chiuse in numero diverso, una sezione del
# solo file che va in coda, e una riga senza sezione che non si conta. I totali
# uniti restano asimmetrici, per la stessa ragione del campione dello STATO.
CAMPIONE_CHIUSE = """\
# commento, non e una voce
Coda\t-\tchiusa\t-\tsettima

Decisioni\t9\tDECISA\t-\tottava
Coda\t-\tchiusa\t-\tnona
Archivio\t-\tchiusa\t-\tsezione del solo file
riga senza tabulazione
"""
ATTESO_UNITI = [["Coda", 1, 3], ["Decisioni", 3, 2], ["Archivio", 0, 1]]


def autoprova():
    """Rende la lista dei difetti dello strumento sul campione; vuota se sano."""
    difetti = []
    sezioni, fuori = conta(CAMPIONE)
    if sezioni != ATTESO:
        difetti.append(f"sezioni {sezioni}, attese {ATTESO}")
    if [n for n, _ in fuori] != [15]:
        difetti.append(f"fuori posizione alle righe {[n for n, _ in fuori]}, attesa la 15")
    if campi(sezioni) != ["aperte=4", "chiuse=2", "Coda=1/1", "Decisioni=3/1"]:
        difetti.append(f"campi {campi(sezioni)}")
    # La mutazione dello STATO deve essere vista: un tag mosso cambia i campi.
    mosso, _ = conta(CAMPIONE.replace("| 1 | [aperta]", "| 1 | [chiusa]"))
    if campi(mosso) == campi(sezioni):
        difetti.append("un tag mosso da aperta a chiusa non cambia i campi")
    chiuse, senza = conta_chiuse(CAMPIONE_CHIUSE)
    uniti = unisci(sezioni, chiuse)
    if uniti != ATTESO_UNITI:
        difetti.append(f"sezioni unite {uniti}, attese {ATTESO_UNITI}")
    if [n for n, _ in senza] != [7]:
        difetti.append(f"righe senza sezione {[n for n, _ in senza]}, attesa la 7")
    if campi(uniti) != ["aperte=4", "chiuse=6", "Coda=1/3", "Decisioni=3/2", "Archivio=0/1"]:
        difetti.append(f"campi uniti {campi(uniti)}")
    # Anche il file delle chiuse va visto: una riga tolta cambia i campi.
    tolta, _ = conta_chiuse(CAMPIONE_CHIUSE.replace("Decisioni\t9\tDECISA\t-\tottava\n", ""))
    if campi(unisci(sezioni, tolta)) == campi(uniti):
        difetti.append("una chiusa tolta dal file non cambia i campi")
    return difetti


def main(argv):
    scrivi = "si"
    if "--scrivi" in argv:
        scrivi = argv[argv.index("--scrivi") + 1]
    if scrivi not in ("si", "no"):
        print(f"ROSSO  --scrivi vuole si o no, non {scrivi!r}")
        return 1

    difetti = autoprova()
    if difetti:
        print("ROSSO  autoprova del riconoscitore fallita: lo strumento non conta come dichiara")
        for d in difetti:
            print(f"         {d}")
        return 1
    print("   OK    autoprova: aperta e chiusa contate in lista e in tabella, verbale e recinto esclusi;"
          " chiuse del file sommate per sezione")

    try:
        with open(STATO, encoding="utf-8") as f:
            testo = f.read()
    except OSError as e:
        print(f"ROSSO  STATO illeggibile: {e}")
        return 1
    try:
        with open(CHIUSE, encoding="utf-8") as f:
            testo_chiuse = f.read()
    except OSError as e:
        print(f"ROSSO  file delle chiuse illeggibile: {e}")
        return 1

    sezioni_stato, fuori = conta(testo)
    sezioni_chiuse, senza = conta_chiuse(testo_chiuse)
    sezioni = unisci(sezioni_stato, sezioni_chiuse)
    for s in sezioni:
        print(f"   {s[1]:>3} aperte {s[2]:>3} chiuse   {s[0]}")
    nuovi = campi(sezioni)
    print(f"   TOTALE  {nuovi[0]}  {nuovi[1]}")
    if not sezioni:
        print("   INFO  zero voci nello STATO e nel file delle chiuse: si registra lo zero, non si giudica")
    for n, riga in fuori:
        print(f"   INFO  tag fuori posizione, non contato: STATO_CORRENTE.md:{n}: {riga[:70]}")
    nello_stato = sum(s[2] for s in sezioni_stato)
    if nello_stato:
        print(f"   INFO  {nello_stato} voci [chiusa] ancora nello STATO: la loro sede e docs/chiuse-stato.tsv")
    for n, riga in senza:
        print(f"   INFO  riga senza sezione, non contata: docs/chiuse-stato.tsv:{n}: {riga[:70]}")

    precedenti = ultima_riga(SERIE)
    if precedenti == nuovi:
        print("   OK    serie allineata: conteggi uguali all'ultima riga, nulla da scrivere")
        return 0
    if scrivi == "no":
        print("   INFO  conteggi diversi dall'ultima riga della serie -- NON scritto: in prepush e ci non si scrive")
        return 0
    nuova = not os.path.exists(SERIE)
    with open(SERIE, "a", encoding="utf-8", newline="\n") as f:
        if nuova:
            f.write(INTESTAZIONE_SERIE)
        f.write("\t".join([datetime.date.today().isoformat()] + nuovi) + "\n")
    print(f"   SCRITTO riga nuova in docs/serie-stato.tsv ({datetime.date.today().isoformat()})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
