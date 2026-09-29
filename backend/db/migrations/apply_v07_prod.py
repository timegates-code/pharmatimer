#!/usr/bin/env python3
# Fase 3 -- Web Push reminder channel, branch A, migration v07 PROD.
"""apply_v07_prod.py
PROD variant of apply_v07_push.py for the Mini production DB.

It imports apply_v07_push.py and changes EXACTLY two things:

  1. the identity guard: @@server_uuid prefix "75170e5c-" (Mini prod) instead
     of the Studio's;
  2. the targets: (DB_NAME,) only. The Mini service has NO DB_NAME_TEST.

Everything else -- the statements read from v07_push.sql, the two-phase identity
guard, the per-statement idempotency, the empty-table precondition, the
post-check -- is the code the Studio run exercised.

Deploy order (CLAUDE.md, section 8): run this BEFORE deploying any code that
names a v07 object, then `make g21` must be green. Run it from the Terminal on
the Mini, from ~/PharmaTimer/backend, with the Mini's venv.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

_SPEC = importlib.util.spec_from_file_location(
    "apply_v07_push", Path(__file__).with_name("apply_v07_push.py")
)
_V07 = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_V07)

# Identity guard: Mini PROD @@server_uuid prefix. ABORT on any mismatch.
MINI_UUID_PREFIX = "75170e5c-"


def main() -> int:
    return _V07.run((_V07.settings.DB_NAME,), MINI_UUID_PREFIX)


if __name__ == "__main__":
    sys.exit(main())
