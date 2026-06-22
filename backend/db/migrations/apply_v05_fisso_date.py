#!/usr/bin/env python3
# Fase 3 F14 Blocco 2 -- idempotency_marker v05 (regenerated par.22.148, identity-guarded)
"""apply_v05_fisso_date.py
Apply the fisso_date model (Spec v1.15 sez. 3.1 + 3.5) to both DB_NAME
(prod/dev) and DB_NAME_TEST:

  1. farmaci.tipo_frequenza ENUM('intervallo','fisso') -> add 'fisso_date'
  2. orari_base.data_specifica DATE NULL (new column)

Regenerated from scratch (the previous file was written in an aborted session
and never executed). The substantive addition over apply_v04/v05 structure is
the IDENTITY GUARD.

Safety:
  - IDENTITY GUARD (phase 1 pre-flight, before ANY ALTER): for each target DB
    connect, SELECT DATABASE(), @@server_uuid, @@hostname, print them, and ABORT
    the whole migration (exit != 0, no ALTER on any DB) if @@server_uuid does not
    start with the Studio-dev prefix. A second barrier re-asserts identity per
    connection in phase 2 before any ALTER. The check always precedes any write.
  - PER-STATEMENT idempotency via information_schema (no error 1060 on re-run):
      * statement 1 skips if 'fisso_date' already in farmaci.tipo_frequenza COLUMN_TYPE
      * statement 2 skips if orari_base.data_specifica already exists
  - POST-CHECK after commit: re-verify enum value + column, else ERROR.
  - TRANSACTIONAL: commit only at the end, rollback on error.

Connection mirrors apply_v04 Finding A: built CONDITIONALLY (option_files vs
user+password). The Mini service authenticates via DB_DEFAULTS_FILE
(DB_USER/DB_PASSWORD are None there); a fixed user+password connect would fail
with Access denied. The password is NEVER printed.

Lesson #18/#21: identity asserted against @@server_uuid before any schema write.
Lesson #24: settings.* are UPPERCASE (Pydantic case_sensitive=True).
"""
from __future__ import annotations
import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from pharmatimer_api.config import settings  # noqa: E402
import mysql.connector  # noqa: E402

# Identity guard: Studio dev @@server_uuid prefix. ABORT on any mismatch.
EXPECTED_UUID_PREFIX = "8c7fac68-"

ENUM_TABLE = "farmaci"
ENUM_COLUMN = "tipo_frequenza"
ENUM_NEW_VALUE = "fisso_date"
COL_TABLE = "orari_base"
COL_COLUMN = "data_specifica"

STMT_ENUM = (
    "ALTER TABLE farmaci MODIFY COLUMN tipo_frequenza "
    "ENUM('intervallo','fisso','fisso_date') NOT NULL"
)
STMT_COLUMN = (
    "ALTER TABLE orari_base ADD COLUMN data_specifica DATE NULL "
    "AFTER descrizione_momento"
)


def _connect(db_name: str):
    """Direct connection mirroring db/connection.init_pool kwargs (apply_v04 Finding A).

    Conditional auth: option_files when DB_DEFAULTS_FILE is set (Mini prod), else
    user+password (Studio dev). database is passed explicitly to override any
    [client] section in the defaults-file. The password is never logged.
    """
    kwargs = {
        "host": settings.DB_HOST,
        "port": settings.DB_PORT,
        "database": db_name,
    }
    if settings.DB_DEFAULTS_FILE:
        kwargs["option_files"] = settings.DB_DEFAULTS_FILE
    else:
        kwargs["user"] = settings.DB_USER
        kwargs["password"] = settings.DB_PASSWORD
    return mysql.connector.connect(**kwargs)


def _identity(cur) -> tuple[str, str, str]:
    """Return (current_database, server_uuid, hostname) for the open connection."""
    cur.execute("SELECT DATABASE(), @@server_uuid, @@hostname")
    row = cur.fetchone()
    db = "" if row[0] is None else str(row[0])
    uuid = "" if row[1] is None else str(row[1])
    host = "" if row[2] is None else str(row[2])
    return db, uuid, host


def _column_type(cur, db_name: str, table: str, column: str) -> str | None:
    """Return COLUMN_TYPE (e.g. enum('intervallo','fisso')) lowercased, or None if absent."""
    cur.execute(
        "SELECT COLUMN_TYPE FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s "
        "LIMIT 1",
        (db_name, table, column),
    )
    row = cur.fetchone()
    return None if row is None else str(row[0]).lower()


def preflight_identity(db_name: str) -> tuple[bool, str]:
    """Connect and assert @@server_uuid prefix BEFORE any ALTER. No write here.

    Returns (ok, message). ok=False means the whole migration must abort.
    """
    try:
        conn = _connect(db_name)
    except mysql.connector.Error as exc:
        return False, f"[{db_name}] CONNECT_ERROR {exc}"
    try:
        cur = conn.cursor()
        db, uuid, host = _identity(cur)
        ok = uuid.startswith(EXPECTED_UUID_PREFIX)
        verdict = "OK" if ok else "ABORT (uuid prefix mismatch)"
        msg = (
            f"[{db_name}] identity: DATABASE()={db} "
            f"server_uuid={uuid} hostname={host} -> {verdict}"
        )
        return ok, msg
    except mysql.connector.Error as exc:
        return False, f"[{db_name}] IDENTITY_ERROR {exc}"
    finally:
        try:
            conn.close()
        except Exception:
            pass


def apply_to_db(db_name: str) -> str:
    """Apply both statements to one DB, each gated independently. Returns status string.

    Identity is re-asserted here too, immediately after connect and before any
    ALTER, as a second barrier (defence in depth). Transactional: commit at end.
    """
    try:
        conn = _connect(db_name)
    except mysql.connector.Error as exc:
        return f"[{db_name}] CONNECT_ERROR {exc}"
    actions: list[str] = []
    try:
        cur = conn.cursor()

        # Barrier: identity before any write.
        _db, uuid, _host = _identity(cur)
        if not uuid.startswith(EXPECTED_UUID_PREFIX):
            return f"[{db_name}] ABORT identity (uuid prefix mismatch, no ALTER)"

        # Statement 1: farmaci.tipo_frequenza enum widening.
        enum_type = _column_type(cur, db_name, ENUM_TABLE, ENUM_COLUMN)
        if enum_type is None:
            return f"[{db_name}] ABORT column {ENUM_TABLE}.{ENUM_COLUMN} not found"
        if ENUM_NEW_VALUE in enum_type:
            actions.append("enum:idempotent_skip")
        else:
            cur.execute(STMT_ENUM)
            actions.append("enum:applied")

        # Statement 2: orari_base.data_specifica column.
        col_type = _column_type(cur, db_name, COL_TABLE, COL_COLUMN)
        if col_type is not None:
            actions.append("data_specifica:idempotent_skip")
        else:
            cur.execute(STMT_COLUMN)
            actions.append("data_specifica:applied")

        conn.commit()

        # Post-check both, after commit.
        post_enum = _column_type(cur, db_name, ENUM_TABLE, ENUM_COLUMN) or ""
        post_col = _column_type(cur, db_name, COL_TABLE, COL_COLUMN)
        if ENUM_NEW_VALUE not in post_enum:
            return f"[{db_name}] ERROR post-check enum missing {ENUM_NEW_VALUE!r}"
        if post_col is None:
            return f"[{db_name}] ERROR post-check column {COL_COLUMN} missing"
        return f"[{db_name}] OK ({', '.join(actions)})"
    except mysql.connector.Error as exc:
        try:
            conn.rollback()
        except Exception:
            pass
        return f"[{db_name}] SQL_ERROR {exc}"
    finally:
        try:
            conn.close()
        except Exception:
            pass


def main() -> int:
    mode = "option_files" if settings.DB_DEFAULTS_FILE else "user+password"
    targets = (settings.DB_NAME, settings.DB_NAME_TEST)
    print(f"settings: DB_HOST={settings.DB_HOST} DB_PORT={settings.DB_PORT} mode={mode}")
    print(f"targets : {targets[0]}, {targets[1]}")
    print(f"identity: require @@server_uuid prefix {EXPECTED_UUID_PREFIX!r}")

    # PHASE 1: identity pre-flight on ALL targets, before ANY ALTER.
    print("--- phase 1: identity pre-flight ---")
    preflight = [preflight_identity(db) for db in targets]
    for ok, msg in preflight:
        print(msg)
    if not all(ok for ok, _ in preflight):
        print("--- ABORT: identity pre-flight failed, no ALTER executed ---")
        return 2

    # PHASE 2: apply (identity re-asserted per connection).
    print("--- phase 2: apply ---")
    results = [apply_to_db(db) for db in targets]
    for r in results:
        print(r)
    ok = all(r.startswith(f"[{db}] OK") for db, r in zip(targets, results))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
