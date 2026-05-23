#!/usr/bin/env python3
# F3-S3-beta CP1 idempotency_marker v01
"""apply_v02_unique_log.py

Apply UNIQUE constraint on log_assunzioni (slot identity) to both
DB_NAME (prod/dev) and DB_NAME_TEST.

Idempotent:
  - skips if idx_log_slot_unique already exists as UNIQUE
  - aborts with non-zero exit if duplicate slot rows are present

Lesson #24 (pre-introspected): settings.DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/
DB_NAME/DB_NAME_TEST are UPPERCASE (Pydantic BaseSettings case_sensitive=True).
"""

from __future__ import annotations

import sys
from pathlib import Path


_BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from pharmatimer_api.config import settings  # noqa: E402
import mysql.connector  # noqa: E402


SQL_FILE = Path(__file__).resolve().parent / "v02_unique_log.sql"
INDEX_NAME = "idx_log_slot_unique"


def _parse_sql(text: str) -> list[str]:
    """Strip line comments + split on ';'."""
    cleaned_lines = []
    for line in text.split("\n"):
        s = line.strip()
        if not s or s.startswith("--"):
            continue
        cleaned_lines.append(line)
    body = "\n".join(cleaned_lines)
    return [s.strip() for s in body.split(";") if s.strip()]


def _has_unique_index(cur, db_name: str) -> bool:
    cur.execute(
        "SELECT NON_UNIQUE FROM information_schema.STATISTICS "
        "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND INDEX_NAME = %s "
        "LIMIT 1",
        (db_name, "log_assunzioni", INDEX_NAME),
    )
    row = cur.fetchone()
    if row is None:
        return False
    # MySQL returns NON_UNIQUE as 0 for UNIQUE indexes.
    return int(row[0]) == 0


def _count_duplicates(cur) -> int:
    cur.execute(
        "SELECT COUNT(*) FROM ("
        "  SELECT utente_id, farmaco_id, data, dose_numero, COUNT(*) AS c "
        "  FROM log_assunzioni "
        "  GROUP BY utente_id, farmaco_id, data, dose_numero "
        "  HAVING c > 1"
        ") AS dup"
    )
    row = cur.fetchone()
    return int(row[0]) if row else 0


def apply_to_db(db_name: str) -> str:
    """Apply migration to one DB. Returns human-readable status string."""
    try:
        conn = mysql.connector.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=db_name,
        )
    except mysql.connector.Error as exc:
        return f"[{db_name}] CONNECT_ERROR {exc}"
    try:
        cur = conn.cursor()
        if _has_unique_index(cur, db_name):
            return f"[{db_name}] idempotent_skip (already_applied)"
        dup = _count_duplicates(cur)
        if dup > 0:
            return (
                f"[{db_name}] ABORT {dup} duplicate slot row(s) present, "
                "manual cleanup required before apply"
            )
        sql_text = SQL_FILE.read_text(encoding="utf-8")
        for stmt in _parse_sql(sql_text):
            cur.execute(stmt)
        conn.commit()
        if not _has_unique_index(cur, db_name):
            return f"[{db_name}] ERROR post-check failed (index not present)"
        return f"[{db_name}] applied OK"
    finally:
        try:
            conn.close()
        except Exception:
            pass


def main() -> int:
    print(f"settings: DB_HOST={settings.DB_HOST} DB_PORT={settings.DB_PORT}")
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
