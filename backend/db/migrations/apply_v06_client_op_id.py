#!/usr/bin/env python3
# Fase 3 OFFLINE-3 CS-2 -- idempotency_marker v06 (derived from apply_v05_fisso_date.py, par.22.198-quattuorvicies/s.6.257)
"""apply_v06_client_op_id.py
Apply the client_op_id plate (Spec v1.17 sez. 3.6 + sez. 14.6) to both DB_NAME
(dev) and DB_NAME_TEST:

  1. log_assunzioni.client_op_id CHAR(36) NULL (new column, AFTER created_at)
  2. UNIQUE INDEX idx_log_client_op_unique (client_op_id)

Derived from the v05 identity-guarded applier (par.22.148/163). The substantive
delta over v05 is the target table/column/index and the SECOND idempotency probe
(an index probe on information_schema.STATISTICS, since v05 only widened an enum
and added a plain column).

Safety:
  - IDENTITY GUARD (phase 1 pre-flight, before ANY ALTER): for each target DB
    connect, SELECT DATABASE(), @@server_uuid, @@hostname, print them, and ABORT
    the whole migration (exit != 0, no ALTER on any DB) if @@server_uuid does not
    start with the Studio-dev prefix. A second barrier re-asserts identity per
    connection in phase 2 before any ALTER. The check always precedes any write.
  - PER-STATEMENT idempotency via information_schema (no error 1060/1061 on re-run):
      * statement 1 skips if log_assunzioni.client_op_id already exists (COLUMNS)
      * statement 2 skips if idx_log_client_op_unique already exists (STATISTICS)
  - POST-CHECK after commit: re-verify column + index, else ERROR.
  - NOTE (regola #2): in MySQL each ALTER does an IMPLICIT COMMIT, so the two ALTERs
    are NOT atomic with each other. If stmt 1 applied and stmt 2 failed, the schema
    would be left mid-way (column present, index absent) -- still backward-compatible
    (nullable column, no UNIQUE yet), and a re-run is safe (idempotent skip of stmt 1,
    completes stmt 2). Real safety = guard + per-statement idempotency + backup.

Connection mirrors apply_v05 Finding A: built CONDITIONALLY (option_files vs
user+password). The password is NEVER printed.

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

TABLE = "log_assunzioni"
COL_COLUMN = "client_op_id"
INDEX_NAME = "idx_log_client_op_unique"

STMT_COLUMN = (
    "ALTER TABLE log_assunzioni "
    "ADD COLUMN client_op_id CHAR(36) NULL AFTER created_at"
)
STMT_INDEX = (
    "ALTER TABLE log_assunzioni "
    "ADD UNIQUE INDEX idx_log_client_op_unique (client_op_id)"
)


def _connect(db_name: str):
    """Direct connection mirroring db/connection.init_pool kwargs (apply_v05 Finding A).

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


def _column_exists(cur, db_name: str, table: str, column: str) -> bool:
    """True if table.column exists in db_name."""
    cur.execute(
        "SELECT 1 FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s "
        "LIMIT 1",
        (db_name, table, column),
    )
    return cur.fetchone() is not None


def _index_exists(cur, db_name: str, table: str, index_name: str) -> bool:
    """True if a (named) index exists on table in db_name."""
    cur.execute(
        "SELECT 1 FROM information_schema.STATISTICS "
        "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND INDEX_NAME = %s "
        "LIMIT 1",
        (db_name, table, index_name),
    )
    return cur.fetchone() is not None


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
    ALTER, as a second barrier (defence in depth). Commit at end; note the
    implicit-commit caveat in the module docstring.
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

        # Statement 1: add column (must precede the index).
        if _column_exists(cur, db_name, TABLE, COL_COLUMN):
            actions.append("client_op_id:idempotent_skip")
        else:
            cur.execute(STMT_COLUMN)
            actions.append("client_op_id:applied")

        # Statement 2: add unique index on the column.
        if _index_exists(cur, db_name, TABLE, INDEX_NAME):
            actions.append("uq_index:idempotent_skip")
        else:
            cur.execute(STMT_INDEX)
            actions.append("uq_index:applied")

        conn.commit()

        # Post-check both, after commit.
        if not _column_exists(cur, db_name, TABLE, COL_COLUMN):
            return f"[{db_name}] ERROR post-check column {COL_COLUMN!r} missing"
        if not _index_exists(cur, db_name, TABLE, INDEX_NAME):
            return f"[{db_name}] ERROR post-check index {INDEX_NAME!r} missing"
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
