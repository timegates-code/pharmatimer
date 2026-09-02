#!/usr/bin/env python3
"""
PharmaTimer -- export the OpenAPI document of the LIVE backend (decisione 3).

`make openapi` runs this with the venv and writes backend/openapi.json, which
git IGNORES: the document is derived from the code every time, never a pinned
expected that ages (Makefile, principle at the top). The frontend contract
test, src/data/repository/ApiRepository.contratto.test.js, reads that file
and goes red naming `make openapi` when it is missing; `make test-frontend`
regenerates it first, so the gate always compares the bridge with the schema
of NOW.

Importing the app needs the settings (backend/.env.dev, or the CI env) and
opens no database connection: the pool starts in the lifespan, which is not
run here.

Usage: venv/bin/python export_openapi.py [path]   (default: openapi.json)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from pharmatimer_api.app import app


def main(argv: list[str]) -> int:
    dest = Path(argv[1] if len(argv) > 1 else "openapi.json")
    doc = app.openapi()
    dest.write_text(
        json.dumps(doc, indent=2, sort_keys=True, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )
    schemi = len(doc.get("components", {}).get("schemas", {}))
    print(f"   openapi {doc.get('openapi')}, versione {doc['info']['version']}, {schemi} schemi -> {dest}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
