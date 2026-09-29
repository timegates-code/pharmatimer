"""Pins of the v07 schema -- Web Push reminder channel, branch A.

The SHARED v07 tables of the test DB are never touched here. The mutation bench
runs this file on tree copies against the same DB: a mutated v07_push.sql
applied to the shared tables would leave them mutated for every test file that
runs before this one. So the pins work on throw-away objects: TEMPORARY tables
built from v01's push_subscriptions and from v07_push.sql, on one dedicated
connection. A TEMPORARY table hides the shared table of the same name in that
session only, and dies with the connection.

Measured on MySQL 9.6.0 before this file was written (2026-09-29): an ALTER on
the temporary shadow leaves the shared table untouched, UNIQUE is enforced on
it (1062), and a FOREIGN KEY on a temporary table is refused (1215). The
transformation therefore drops the CONSTRAINT lines: foreign keys are NOT pinned
here, the unique keys are.

Every pin runs in both directions -- the duplicate is refused, a distinct key
is accepted -- and each direction has its row in scripts/audit/mutazioni.py:
UNIQUE INDEX -> INDEX must turn the first red, a wider key the second.
"""
from __future__ import annotations

import hashlib
import importlib.util
import re
from collections.abc import Generator
from pathlib import Path

import mysql.connector
import pytest

from pharmatimer_api.config import settings

_MIGRATIONS = Path(__file__).resolve().parents[1] / "db" / "migrations"
_SPEC = importlib.util.spec_from_file_location(
    "apply_v07_push", _MIGRATIONS / "apply_v07_push.py"
)
_V07 = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_V07)


def _temporary(stmt: str) -> str:
    """CREATE TABLE IF NOT EXISTS -> CREATE TEMPORARY TABLE, CONSTRAINT lines dropped."""
    kept = [ln for ln in stmt.splitlines() if not ln.strip().upper().startswith("CONSTRAINT")]
    body = re.sub(r",\s*\n\)", "\n)", "\n".join(kept))
    return re.sub(r"^CREATE TABLE IF NOT EXISTS", "CREATE TEMPORARY TABLE", body, flags=re.I)


def _throwaway_statements() -> tuple[list[str], list[str]]:
    """(statements, temporary tables): v01's push_subscriptions, then v07 in file order."""
    v01 = _V07.statements((_MIGRATIONS / "v01_init.sql").read_text(encoding="utf-8"))
    base = [s for s in v01 if re.match(r"CREATE TABLE IF NOT EXISTS push_subscriptions\s*\(", s)]
    assert len(base) == 1, "v01_init.sql must create push_subscriptions exactly once"
    stmts, tables = [_temporary(base[0])], ["push_subscriptions"]
    for stmt in _V07.statements(_V07.SQL_FILE.read_text(encoding="utf-8")):
        kind, table, _name = _V07.objects(stmt)[0]
        if kind == "table":
            stmts.append(_temporary(stmt))
            tables.append(table)
        else:
            stmts.append(stmt)  # an ALTER on push_subscriptions reaches the shadow
    return stmts, tables


@pytest.fixture(scope="module")
def ombra() -> Generator[mysql.connector.MySQLConnection, None, None]:
    """One dedicated connection holding the throw-away v07 objects.

    Never a pooled connection: a pool would hand the shadows to other tests.
    """
    conn = mysql.connector.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME_TEST,
        charset="utf8mb4",
        collation="utf8mb4_unicode_ci",
        autocommit=True,
    )
    cur = conn.cursor()
    tables: list[str] = []
    try:
        cur.execute("SELECT DATABASE()")
        db = cur.fetchone()[0]
        assert db == settings.DB_NAME_TEST and db != settings.DB_NAME, db
        stmts, tables = _throwaway_statements()
        for stmt in stmts:
            cur.execute(stmt)
        yield conn
    finally:
        for table in reversed(tables):
            cur.execute(f"DROP TEMPORARY TABLE IF EXISTS {table}")
        cur.close()
        conn.close()


def _rifiutato(cur, sql: str, params: tuple) -> None:
    with pytest.raises(mysql.connector.IntegrityError) as exc:
        cur.execute(sql, params)
    assert exc.value.errno == 1062


def test_calendario_una_voce_per_dose(ombra) -> None:
    """One published instant per dose of a user (key of idx_log_slot_unique)."""
    cur = ombra.cursor()
    cur.execute("DELETE FROM push_calendario")
    sql = (
        "INSERT INTO push_calendario (utente_id, farmaco_id, data, dose_numero, istante_ms, "
        "titolo, corpo) VALUES (%s, %s, %s, %s, %s, 'Titolo', 'Corpo')"
    )
    cur.execute(sql, (2, 22, "2026-09-29", 1, 1_759_125_600_000))
    # Permissive direction: another dose of the same drug and day is accepted.
    cur.execute(sql, (2, 22, "2026-09-29", 2, 1_759_154_400_000))
    # Restrictive direction: a second instant for the same dose is refused.
    _rifiutato(cur, sql, (2, 22, "2026-09-29", 1, 1_759_129_200_000))


def test_dispatch_una_decisione_per_dose_e_telefono(ombra) -> None:
    """At most one send decision per dose and per phone: INSERT before the POST."""
    cur = ombra.cursor()
    cur.execute("DELETE FROM push_dispatch")
    sql = (
        "INSERT INTO push_dispatch (subscription_id, utente_id, farmaco_id, data, dose_numero, "
        "istante_ms, stato, deciso_ms) VALUES (%s, 2, 22, '2026-09-29', 1, 1759125600000, %s, %s)"
    )
    cur.execute(sql, (7, "accettato", 1_759_125_600_500))
    # Permissive direction: the same dose on another phone is accepted.
    cur.execute(sql, (8, "accettato", 1_759_125_600_600))
    # Restrictive direction: a second decision for the same dose and phone is refused.
    _rifiutato(cur, sql, (7, "in_invio", 1_759_125_660_000))


def test_avviso_fine_uno_per_istante_e_telefono(ombra) -> None:
    """At most one end-of-horizon notice per published instant and per phone."""
    cur = ombra.cursor()
    cur.execute("DELETE FROM push_avvisi_fine")
    sql = (
        "INSERT INTO push_avvisi_fine (subscription_id, utente_id, avviso_fine_ms, entro_ms, "
        "stato, deciso_ms) VALUES (7, 2, %s, %s, 'accettato', %s)"
    )
    cur.execute(sql, (1_759_215_600_000, 1_759_219_200_000, 1_759_215_600_400))
    # Permissive direction: the notice of a later publication is accepted.
    cur.execute(sql, (1_759_302_000_000, 1_759_305_600_000, 1_759_302_000_400))
    # Restrictive direction: the same notice instant again is refused.
    _rifiutato(cur, sql, (1_759_215_600_000, 1_759_219_200_000, 1_759_215_660_000))


def test_subscription_un_endpoint_una_riga(ombra) -> None:
    """One row per endpoint, keyed on its hash: endpoints differing in case stay distinct."""
    cur = ombra.cursor()
    cur.execute("DELETE FROM push_subscriptions")
    sql = (
        "INSERT INTO push_subscriptions (utente_id, endpoint, p256dh_key, auth_key, endpoint_hash) "
        "VALUES (2, %s, 'p256dh', 'auth', %s)"
    )
    alto = "https://web.push.apple.com/QmAbC"
    basso = "https://web.push.apple.com/QmaBc"
    cur.execute(sql, (alto, hashlib.sha256(alto.encode()).hexdigest()))
    # Permissive direction: an endpoint differing only in case is another endpoint.
    cur.execute(sql, (basso, hashlib.sha256(basso.encode()).hexdigest()))
    # Restrictive direction: the same endpoint again is refused.
    _rifiutato(cur, sql, (alto, hashlib.sha256(alto.encode()).hexdigest()))
