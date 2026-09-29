#!/usr/bin/env python3
# Fase 3 -- Web Push reminder channel, branch A, migration v07 (decisions 8, 9, 11, 12).
"""apply_v07_push.py
Apply v07_push.sql to DB_NAME (dev) and DB_NAME_TEST on the Studio.

SINGLE SOURCE. The statements are READ from v07_push.sql, the file CI runs as
is on a fresh database (.github/workflows/gate.yml). The v04-v06 appliers carry
their DDL as Python strings, a second copy that can drift from the .sql they
sit next to; this one executes the .sql itself.

Safety, as in apply_v06_client_op_id.py:
  - IDENTITY GUARD before any write: phase 1 pre-flight on every target, phase 2
    barrier on every connection; ABORT on @@server_uuid prefix mismatch.
  - PER-STATEMENT idempotency via information_schema: a statement whose object
    already exists is skipped. A statement kind this module does not know
    (anything but CREATE TABLE IF NOT EXISTS, ADD COLUMN, ADD [UNIQUE] INDEX)
    aborts before the first write.
  - PRECONDITION: an ADD COLUMN ... NOT NULL without DEFAULT runs only on an
    empty table (endpoint_hash has no backfill: measured zero rows on the Mini
    on 2026-09-03, and no code writes push_subscriptions).
  - POST-CHECK after the run: every table, column and index the file declares
    must exist.
  - Each DDL statement commits implicitly: a failure leaves the schema part-way,
    still additive, and a re-run completes it.

apply_v07_prod.py reuses this module with the Mini's identity and DB_NAME only.
The password is never printed.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from pharmatimer_api.config import settings  # noqa: E402
import mysql.connector  # noqa: E402

SQL_FILE = Path(__file__).with_name("v07_push.sql")

# Identity guard: Studio dev @@server_uuid prefix. ABORT on any mismatch.
STUDIO_UUID_PREFIX = "8c7fac68-"

_RE_CREATE = re.compile(r"^CREATE TABLE IF NOT EXISTS (\w+)\s*\(", re.I)
_RE_ADD_COLUMN = re.compile(r"^ALTER TABLE (\w+)\s+ADD COLUMN (\w+)\s", re.I)
_RE_ADD_INDEX = re.compile(r"^ALTER TABLE (\w+)\s+ADD (?:UNIQUE )?INDEX (\w+)\s", re.I)
_RE_INDEX_IN_CREATE = re.compile(r"^\s*(?:UNIQUE\s+)?INDEX\s+(\w+)", re.I | re.M)


def statements(text: str) -> list[str]:
    """Split a migration file into statements.

    Whole-line '--' comments are dropped and ';' ends a statement. Enough for
    v07_push.sql, which carries no ';' inside a literal and no trailing comment.
    """
    kept = [line for line in text.splitlines() if not line.strip().startswith("--")]
    return [s.strip() for s in "\n".join(kept).split(";") if s.strip()]


def objects(stmt: str) -> list[tuple[str, str, str]]:
    """The (kind, table, name) objects a statement creates, its own object first."""
    m = _RE_CREATE.match(stmt)
    if m:
        table = m.group(1)
        return [("table", table, table)] + [
            ("index", table, name) for name in _RE_INDEX_IN_CREATE.findall(stmt)
        ]
    m = _RE_ADD_COLUMN.match(stmt)
    if m:
        return [("column", m.group(1), m.group(2))]
    m = _RE_ADD_INDEX.match(stmt)
    if m:
        return [("index", m.group(1), m.group(2))]
    raise ValueError("statement kind not handled by this applier: " + stmt[:70])


def needs_empty_table(stmt: str) -> str | None:
    """The table that must be empty before stmt runs, or None."""
    m = _RE_ADD_COLUMN.match(stmt)
    upper = stmt.upper()
    if m and "NOT NULL" in upper and "DEFAULT" not in upper:
        return m.group(1)
    return None


def _connect(db_name: str):
    """Direct connection mirroring apply_v06 (conditional auth, explicit database)."""
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
    return tuple("" if v is None else str(v) for v in row)


def exists(cur, db_name: str, kind: str, table: str, name: str) -> bool:
    """True if the object is present in db_name."""
    if kind == "table":
        cur.execute(
            "SELECT 1 FROM information_schema.TABLES "
            "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s LIMIT 1",
            (db_name, table),
        )
    elif kind == "column":
        cur.execute(
            "SELECT 1 FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s LIMIT 1",
            (db_name, table, name),
        )
    else:
        cur.execute(
            "SELECT 1 FROM information_schema.STATISTICS "
            "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND INDEX_NAME = %s LIMIT 1",
            (db_name, table, name),
        )
    return cur.fetchone() is not None


def preflight_identity(db_name: str, uuid_prefix: str) -> tuple[bool, str]:
    """Connect and assert the @@server_uuid prefix. No write here."""
    try:
        conn = _connect(db_name)
    except mysql.connector.Error as exc:
        return False, f"[{db_name}] CONNECT_ERROR {exc}"
    try:
        cur = conn.cursor()
        db, uuid, host = _identity(cur)
        ok = uuid.startswith(uuid_prefix)
        verdict = "OK" if ok else "ABORT (uuid prefix mismatch)"
        return ok, f"[{db_name}] identity: DATABASE()={db} server_uuid={uuid} hostname={host} -> {verdict}"
    except mysql.connector.Error as exc:
        return False, f"[{db_name}] IDENTITY_ERROR {exc}"
    finally:
        try:
            conn.close()
        except Exception:
            pass


def apply_to_db(db_name: str, uuid_prefix: str, stmts: list[str]) -> str:
    """Apply every statement not yet applied to one DB, then post-check. Returns a status line."""
    try:
        conn = _connect(db_name)
    except mysql.connector.Error as exc:
        return f"[{db_name}] CONNECT_ERROR {exc}"
    done: list[str] = []
    try:
        cur = conn.cursor()
        # Barrier: identity before any write.
        _db, uuid, _host = _identity(cur)
        if not uuid.startswith(uuid_prefix):
            return f"[{db_name}] ABORT identity (uuid prefix mismatch, no DDL)"
        for stmt in stmts:
            kind, table, name = objects(stmt)[0]
            if exists(cur, db_name, kind, table, name):
                done.append(f"{name}:skip")
                continue
            vuota = needs_empty_table(stmt)
            if vuota is not None:
                cur.execute(f"SELECT COUNT(*) FROM {vuota}")
                righe = cur.fetchone()[0]
                if righe:
                    return (f"[{db_name}] ABORT {vuota} holds {righe} rows: {name} is NOT NULL "
                            f"without a default ({', '.join(done) or 'nothing applied'})")
            cur.execute(stmt)
            done.append(f"{name}:applied")
        conn.commit()
        missing = [f"{k} {t}.{n}" for s in stmts for (k, t, n) in objects(s)
                   if not exists(cur, db_name, k, t, n)]
        if missing:
            return f"[{db_name}] ERROR post-check, missing: {'; '.join(missing)}"
        return f"[{db_name}] OK ({', '.join(done)})"
    except mysql.connector.Error as exc:
        try:
            conn.rollback()
        except Exception:
            pass
        return f"[{db_name}] SQL_ERROR {exc} ({', '.join(done) or 'nothing applied'})"
    finally:
        try:
            conn.close()
        except Exception:
            pass


def run(targets: tuple[str, ...], uuid_prefix: str) -> int:
    """Two phases over the targets. 0 = all OK, 1 = a target failed, 2 = identity abort."""
    stmts = statements(SQL_FILE.read_text(encoding="utf-8"))
    for stmt in stmts:
        objects(stmt)  # an unknown statement kind raises before any connection
    mode = "option_files" if settings.DB_DEFAULTS_FILE else "user+password"
    print(f"settings: DB_HOST={settings.DB_HOST} DB_PORT={settings.DB_PORT} mode={mode}")
    print(f"source  : {SQL_FILE.name}, {len(stmts)} statements")
    print(f"targets : {', '.join(targets)}")
    print(f"identity: require @@server_uuid prefix {uuid_prefix!r}")

    print("--- phase 1: identity pre-flight ---")
    preflight = [preflight_identity(db, uuid_prefix) for db in targets]
    for _ok, msg in preflight:
        print(msg)
    if not all(ok for ok, _ in preflight):
        print("--- ABORT: identity pre-flight failed, no DDL executed ---")
        return 2

    print("--- phase 2: apply ---")
    results = [apply_to_db(db, uuid_prefix, stmts) for db in targets]
    for r in results:
        print(r)
    return 0 if all(r.startswith(f"[{db}] OK") for db, r in zip(targets, results)) else 1


def main() -> int:
    return run((settings.DB_NAME, settings.DB_NAME_TEST), STUDIO_UUID_PREFIX)


if __name__ == "__main__":
    sys.exit(main())
