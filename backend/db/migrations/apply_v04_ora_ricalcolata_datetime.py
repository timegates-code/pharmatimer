#!/usr/bin/env python3
# Fase 3 STEP CODICE Opzione 1 -- idempotency_marker v04
"""apply_v04_ora_ricalcolata_datetime.py
Apply ora_ricalcolata TIME -> DATETIME (Spec v1.13 sez.3.6) to both
DB_NAME (prod/dev) and DB_NAME_TEST.

Idempotent:
  - skips if log_assunzioni.ora_ricalcolata is already DATETIME
  - post-check verifies the column is DATETIME after apply

Finding A (vs apply_v02): connection is built CONDITIONALLY (option_files vs
user+password), mirroring db/connection.init_pool. The Mini service authenticates
via DB_DEFAULTS_FILE (DB_USER/DB_PASSWORD are None there); a fixed user+password
connect (as in apply_v02) would fail with Access denied.

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

SQL_FILE = Path(__file__).resolve().parent / "v04_ora_ricalcolata_datetime.sql"
TABLE = "log_assunzioni"
COLUMN = "ora_ricalcolata"
TARGET_TYPE = "datetime"  # INFORMATION_SCHEMA.COLUMNS.DATA_TYPE is lowercase


def _connect(db_name: str):
    """Direct connection mirroring db/connection.init_pool kwargs (Finding A).

    Conditional auth: option_files when DB_DEFAULTS_FILE is set (Mini prod),
    else user+password (Studio dev). database is passed explicitly to override
    any [client] section in the defaults-file.
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


def _column_data_type(cur, db_name: str) -> str | None:
    cur.execute(
        "SELECT DATA_TYPE FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s "
        "LIMIT 1",
        (db_name, TABLE, COLUMN),
    )
    row = cur.fetchone()
    return None if row is None else str(row[0]).lower()


def _parse_sql(text: str) -> list[str]:
    """Strip line comments + split on ';' (same as apply_v02)."""
    cleaned_lines = []
    for line in text.split("\n"):
        s = line.strip()
        if not s or s.startswith("--"):
            continue
        cleaned_lines.append(line)
    body = "\n".join(cleaned_lines)
    return [s.strip() for s in body.split(";") if s.strip()]


def apply_to_db(db_name: str) -> str:
    """Apply migration to one DB. Returns human-readable status string."""
    try:
        conn = _connect(db_name)
    except mysql.connector.Error as exc:
        return f"[{db_name}] CONNECT_ERROR {exc}"
    try:
        cur = conn.cursor()
        current = _column_data_type(cur, db_name)
        if current is None:
            return f"[{db_name}] ABORT column {TABLE}.{COLUMN} not found"
        if current == TARGET_TYPE:
            return f"[{db_name}] idempotent_skip (already_datetime)"
        if current != "time":
            return (
                f"[{db_name}] ABORT unexpected current type {current!r} "
                f"(expected 'time')"
            )
        sql_text = SQL_FILE.read_text(encoding="utf-8")
        for stmt in _parse_sql(sql_text):
            cur.execute(stmt)
        conn.commit()
        post = _column_data_type(cur, db_name)
        if post != TARGET_TYPE:
            return f"[{db_name}] ERROR post-check failed (type={post!r})"
        return f"[{db_name}] applied OK (rows updated={cur.rowcount})"
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
    print(f"settings: DB_HOST={settings.DB_HOST} DB_PORT={settings.DB_PORT} mode={mode}")
    print(f"targets : {settings.DB_NAME}, {settings.DB_NAME_TEST}")
    print(f"sql_file: {SQL_FILE}")
    results = [apply_to_db(settings.DB_NAME), apply_to_db(settings.DB_NAME_TEST)]
    print("---")
    for r in results:
        print(r)
    ok = all(("applied OK" in r) or ("idempotent_skip" in r) for r in results)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
