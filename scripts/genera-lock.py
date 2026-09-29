#!/usr/bin/env python3
"""PharmaTimer -- genera backend/requirements.lock dal report di una risoluzione di pip.

Uso:  backend/venv/bin/python scripts/genera-lock.py <report.json> > backend/requirements.lock

Il report e quello di `pip install --dry-run --ignore-installed --report`,
lanciato sullo Studio con il freeze del venv come vincolo, cosi le versioni
gia installate non si muovono. Il primo e la sonda M4 del 2026-09-29.

Il lock porta ogni pacchetto della risoluzione tranne il backend editable:
nome==versione e lo sha256 dell artefatto che pip ha scelto per la
piattaforma del report, che e quella dello Studio e del Mini (macOS arm64,
CPython 3.13). Una voce per riga, in ordine di nome: la vista senza hash, che
serve alla CI, si ricava togliendo tutto dopo il primo spazio. Il lock non si
scrive a mano: si rigenera.

Rifiuta, senza scrivere nulla: un report senza voci, una voce senza sha256,
un artefatto che non sia una wheel o un sorgente scaricato da un indice.
"""
import json
import re
import sys


def canonico(nome):
    return re.sub(r"[-_.]+", "-", nome).lower()


def voci(report):
    """[(nome, versione, sha256, file)] in ordine di nome; SystemExit su una voce illeggibile."""
    out = []
    for it in report.get("install", []):
        info = it.get("download_info", {})
        if "dir_info" in info:
            continue  # il backend editable: si installa a parte, non entra nel lock
        md = it["metadata"]
        archivio = info.get("archive_info")
        if archivio is None:
            raise SystemExit("voce senza archivio: %s" % md.get("name"))
        sha = (archivio.get("hashes") or {}).get("sha256")
        if not sha and (archivio.get("hash") or "").startswith("sha256="):
            sha = archivio["hash"].split("=", 1)[1]
        if not sha:
            raise SystemExit("voce senza sha256: %s" % md.get("name"))
        file = info.get("url", "").rsplit("/", 1)[-1]
        if not file.endswith((".whl", ".tar.gz", ".zip")):
            raise SystemExit("artefatto sconosciuto per %s: %s" % (md.get("name"), file))
        out.append((canonico(md["name"]), md["version"], sha, file))
    if not out:
        raise SystemExit("report senza voci")
    return sorted(out)


def main():
    with open(sys.argv[1], encoding="utf-8") as fh:
        report = json.load(fh)
    amb = report.get("environment", {})
    righe = voci(report)
    sorgenti = ["%s %s" % (n, v) for n, v, _sha, f in righe if not f.endswith(".whl")]
    print("# backend/requirements.lock -- NON SI MODIFICA A MANO: si rigenera con")
    print("# scripts/genera-lock.py dal report di una risoluzione di pip.")
    print("# Report di pip %s su %s %s, CPython %s: la piattaforma dello Studio e del Mini."
          % (report.get("pip_version"), amb.get("sys_platform"), amb.get("platform_machine"),
             amb.get("python_full_version")))
    print("# %d voci, ciascuna con lo sha256 del suo artefatto. Si installa con" % len(righe))
    print("# deploy/installa-dal-lock.sh, in modalita hash, senza risoluzione.")
    print("# Sorgenti da costruire, con il setuptools di questo lock: %s."
          % (", ".join(sorgenti) or "nessuno"))
    for nome, versione, sha, _file in righe:
        print("%s==%s --hash=sha256:%s" % (nome, versione, sha))


if __name__ == "__main__":
    main()
