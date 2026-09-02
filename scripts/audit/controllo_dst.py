#!/usr/bin/env python3
"""
PharmaTimer -- controllo positivo DST (`make controllo-dst`).

Un pin verde non e un pin efficace (CLAUDE.md sez. 6). I file *.dst.test.js
dichiarano di misurare lo ora legale: lo si prova facendoli girare in un fuso
che NON ce l ha, con TZ=Etc/UTC nello ambiente e una config senza pin
(scripts/audit/vitest.senza-fuso.config.js), e pretendendo che OGNI test
arrossi. Un test di quei file che resta verde senza ora legale non misura lo
ora legale, e il controllo lo NOMINA.

Esiti che distingue, dichiarati prima della misura:
  VERDE  ogni file *.dst e stato eseguito, ogni suo test e rosso sotto UTC.
  ROSSO  nessun file *.dst (il controllo non ha soggetti: e rotto, non vuoto);
         un file *.dst non eseguito; un test verde o saltato sotto UTC;
         rapporto vitest illeggibile (harness rotta, non codice).
"""
from __future__ import annotations

import glob
import json
import os
import subprocess
import sys
import tempfile

CONFIG = "scripts/audit/vitest.senza-fuso.config.js"
FUSO_SENZA_ORA_LEGALE = "Etc/UTC"


def main() -> int:
    os.umask(0o022)
    print("== CONTROLLO DST: i test *.dst.test.js DEVONO arrossare senza ora legale (TZ=%s) ==" % FUSO_SENZA_ORA_LEGALE)
    soggetti = sorted(
        os.path.abspath(p)
        for p in glob.glob("src/**/*.dst.test.js", recursive=True)
        + glob.glob("src/**/*.dst.test.jsx", recursive=True)
    )
    if not soggetti:
        print("ROSSO  nessun file *.dst.test.js: il controllo non ha soggetti, quindi e rotto")
        return 1

    tmp = tempfile.mkdtemp(prefix="controllo-dst-")
    rapporto = os.path.join(tmp, "dst.json")
    env = dict(os.environ, TZ=FUSO_SENZA_ORA_LEGALE)
    cmd = [
        "npx", "vitest", "run",
        "--config", CONFIG,
        "--reporter=json", "--outputFile=" + rapporto,
    ]
    # Lo exit code di vitest e 1 PER COSTRUZIONE quando i test arrossano, ed e
    # cio che qui si vuole: non e un errore da propagare, si legge il rapporto.
    subprocess.run(cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    try:
        with open(rapporto, encoding="utf-8") as fh:
            dati = json.load(fh)
    except (OSError, ValueError):
        print("ROSSO  vitest non ha prodotto un rapporto leggibile: e la HARNESS a essere rotta, non il codice")
        print("       riprodurre: TZ=%s npx vitest run --config %s" % (FUSO_SENZA_ORA_LEGALE, CONFIG))
        return 1

    eseguiti = {os.path.abspath(r.get("name", "")) for r in dati.get("testResults", [])}
    mancanti = [p for p in soggetti if p not in eseguiti]
    totale = int(dati.get("numTotalTests", 0))
    rossi = int(dati.get("numFailedTests", 0))
    verdi = int(dati.get("numPassedTests", 0))
    saltati = totale - rossi - verdi
    non_rossi = [
        (os.path.relpath(r.get("name", "")), a.get("fullName", "?"), a.get("status"))
        for r in dati.get("testResults", [])
        for a in r.get("assertionResults", [])
        if a.get("status") != "failed"
    ]
    for p in soggetti:
        print("   %-48s %s" % (os.path.relpath(p), "eseguito" if p in eseguiti else "NON ESEGUITO"))
    print("   test %d: rossi %d, verdi %d, saltati %d" % (totale, rossi, verdi, saltati))

    rc = 0
    if mancanti:
        print("ROSSO  file *.dst non eseguiti: la config non li include")
        rc = 1
    if totale == 0:
        print("ROSSO  zero test eseguiti: il controllo non ha misurato nulla")
        rc = 1
    if non_rossi:
        print("ROSSO  test che NON arrossano senza ora legale, quindi non la misurano:")
        for f, nome, stato in non_rossi:
            print("       %s  [%s]  %s" % (f, stato, nome))
        rc = 1
    if rc == 0:
        print("VERDE  ogni test *.dst arrossa senza ora legale: misurano davvero lo ora legale")
    return rc


if __name__ == "__main__":
    sys.exit(main())
