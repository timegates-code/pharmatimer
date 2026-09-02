#!/usr/bin/env python3
"""PharmaTimer -- controllo della convenzione tipografica (CLAUDE.md, in testa).

Uso:  python3 scripts/audit/tipografia.py [--conteggio]
      --conteggio stampa il solo numero dei reperti, per make lint.

Cerca ESATTAMENTE questo, e nientaltro, su ogni file tracciato non binario:
  1. path non ASCII;
  2. caratteri invisibili: NBSP U+00A0, zero-width U+200B U+200C U+200D,
     word joiner U+2060, BOM U+FEFF in qualunque posizione;
  3. virgolette tipografiche: U+2018 U+2019 U+201C U+201D;
  4. fine riga MISTI nello stesso file, cioe CRLF insieme a LF. Un file tutto
     CRLF non e misto: si stampa come INFO e non conta.
Non cerca lettere accentate ne trattini: la prosa e UTF-8 per convenzione.
Gli identificatori ASCII li misurano ruff (PLC2401 e PLC2403) ed eslint
(id-match), dentro make lint, non questo file.

Fuori perimetro, e DICHIARATI a ogni esecuzione: i due Changelog archiviati,
Fase 2 e Fase 3. Si leggono e non si scrivono, e riscriverli per un apostrofo
sarebbe M3 applicato al record. Le loro violazioni si stampano come INFO.

Uscita 0 con zero reperti, 1 altrimenti.
"""
import subprocess
import sys

# Gli scalari sono scritti come escape, mai come glifo: altrimenti questo file
# violerebbe la convenzione che misura.
INVISIBILI = {
    "\u00a0": "NBSP U+00A0",
    "\u200b": "zero-width space U+200B",
    "\u200c": "zero-width non-joiner U+200C",
    "\u200d": "zero-width joiner U+200D",
    "\u2060": "word joiner U+2060",
    "\ufeff": "BOM U+FEFF",
}
VIRGOLETTE = {
    "\u2018": "apice tipografico sinistro U+2018",
    "\u2019": "apice tipografico destro U+2019",
    "\u201c": "virgolette tipografiche sinistre U+201C",
    "\u201d": "virgolette tipografiche destre U+201D",
}
ARCHIVI = ("PharmaTimer_Changelog_Fase2.md", "PharmaTimer_Changelog_Fase3.md")


def tracciati():
    """Tracciati PIU non tracciati non ignorati.

    Il solo indice lascerebbe fuori un file nuovo finche non e in git: questo
    stesso script, appena scritto, si e misurato pulito senza essere stato
    letto. Un non tracciato non ignorato e comunque DRIFT per albero.
    """
    out = subprocess.run(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
                         capture_output=True).stdout
    return sorted({p.decode("utf-8", "surrogateescape") for p in out.split(b"\0") if p})


def esamina(path):
    """Rende (reperti, info): liste di stringhe gia formattate."""
    reperti, info = [], []
    if not path.isascii():
        reperti.append("%s  path non ASCII" % path)
    try:
        with open(path, "rb") as fh:
            b = fh.read()
    except OSError as exc:
        info.append("%s  non leggibile: %s" % (path, exc))
        return reperti, info
    if b"\0" in b:
        return reperti, info  # binario: fuori perimetro per natura
    crlf = b.count(b"\r\n")
    lf = b.count(b"\n") - crlf
    if crlf and lf:
        reperti.append("%s  fine riga MISTI: %d CRLF e %d LF" % (path, crlf, lf))
    elif crlf:
        info.append("%s  tutto CRLF (%d righe): non misto, non conta" % (path, crlf))
    testo = b.decode("utf-8", "replace")
    for n_riga, riga in enumerate(testo.split("\n"), 1):
        for ch, nome in list(INVISIBILI.items()) + list(VIRGOLETTE.items()):
            col = riga.find(ch)
            while col != -1:
                reperti.append("%s:%d:%d  %s" % (path, n_riga, col + 1, nome))
                col = riga.find(ch, col + 1)
    return reperti, info


def main(argv):
    solo_conteggio = "--conteggio" in argv
    reperti, info, archivio = [], [], []
    for p in tracciati():
        r, i = esamina(p)
        if p in ARCHIVI:
            archivio += r
            continue
        reperti += r
        info += i
    if solo_conteggio:
        print(len(reperti))
        return 0 if not reperti else 1
    print("== TIPOGRAFIA (CLAUDE.md, in testa): invisibili, virgolette tipografiche,")
    print("   fine riga misti, path non ASCII. Prosa UTF-8 ammessa. ==")
    for r in reperti:
        print("  ROSSO  " + r)
    for i in info:
        print("  INFO   " + i)
    print("  INFO   fuori perimetro, archivi congelati: %s" % ", ".join(ARCHIVI))
    for r in archivio:
        print("  INFO   (archivio, non conta) " + r)
    print("tipografia reperti=%d" % len(reperti))
    return 0 if not reperti else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
