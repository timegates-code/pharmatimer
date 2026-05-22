"""
PharmaTimer F3-S1-bis-delta parte 2/2 CP4
Pytest fixtures: test pool puntato a DB_NAME_TEST, FK-safe cleanup autouse,
seed_owner inline + helper insert_test_user/insert_test_farmaco, TestClient
con get_db override (no lifespan via TestClient senza context manager).
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import date
from typing import Callable, Generator, Tuple

import pytest
from fastapi.testclient import TestClient
from mysql.connector import pooling
from mysql.connector.pooling import MySQLConnectionPool

from pharmatimer_api.app import app
from pharmatimer_api.config import settings
from pharmatimer_api.db import connection as conn_module
from pharmatimer_api.db.dependencies import get_db


_TRUNCATE_ORDER = [
    "log_assunzioni",
    "orari_base",
    "farmaci",
    "impostazioni_app",
    "push_subscriptions",
    "profilo_utente",
    "permessi",
    "utenti",
]


@pytest.fixture(scope="session")
def db_test_pool() -> Generator[MySQLConnectionPool, None, None]:
    """Session-scope test pool pointing to DB_NAME_TEST.

    Patches connection._pool so db_ping() and get_connection() resolve to test pool.
    """
    pool = pooling.MySQLConnectionPool(
        pool_name="pharmatimer_test_pool",
        pool_size=5,
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME_TEST,
        charset="utf8mb4",
        collation="utf8mb4_unicode_ci",
        autocommit=False,
    )
    original = conn_module._pool
    conn_module._pool = pool
    yield pool
    conn_module._pool = original


@pytest.fixture(autouse=True)
def cleanup_test_data(db_test_pool: MySQLConnectionPool) -> Generator[None, None, None]:
    """FK-safe TRUNCATE before each test (sub-AMB F3-S1.H per-test default)."""
    conn = db_test_pool.get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SET FOREIGN_KEY_CHECKS = 0")
        for table in _TRUNCATE_ORDER:
            cur.execute(f"TRUNCATE TABLE {table}")
        cur.execute("SET FOREIGN_KEY_CHECKS = 1")
        conn.commit()
        cur.close()
    finally:
        conn.close()
    yield


@pytest.fixture
def seed_owner_test(db_test_pool: MySQLConnectionPool) -> Tuple[str, int]:
    """Inline idempotent owner seed for tests. Returns (token_plaintext, owner_id)."""
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    conn = db_test_pool.get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO utenti (nome_visualizzato, ruolo, token_hash, attivo) "
            "VALUES (%s, 'owner', %s, TRUE)",
            ("TestOwner", token_hash),
        )
        owner_id = cur.lastrowid
        cur.execute(
            "INSERT INTO permessi (caregiver_id, paziente_id, permesso, notifiche_caregiver_attive) "
            "VALUES (%s, %s, 'admin', FALSE)",
            (owner_id, owner_id),
        )
        conn.commit()
        cur.close()
    finally:
        conn.close()
    return token, owner_id


@pytest.fixture
def insert_test_user(db_test_pool: MySQLConnectionPool) -> Callable[..., Tuple[str, int]]:
    """Factory fixture: insert additional user. Returns (token_plaintext, user_id)."""
    def _insert(nome: str = "OtherUser", ruolo: str = "paziente", attivo: bool = True) -> Tuple[str, int]:
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        conn = db_test_pool.get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO utenti (nome_visualizzato, ruolo, token_hash, attivo) "
                "VALUES (%s, %s, %s, %s)",
                (nome, ruolo, token_hash, attivo),
            )
            user_id = cur.lastrowid
            conn.commit()
            cur.close()
        finally:
            conn.close()
        return token, user_id

    return _insert


@pytest.fixture
def insert_test_farmaco(db_test_pool: MySQLConnectionPool) -> Callable[..., int]:
    """Factory fixture: insert farmaco with minimal required + sensible defaults."""
    def _insert(utente_id: int, nome: str = "Test", **overrides) -> int:
        defaults = {
            "principio_attivo": None,
            "funzione": None,
            "tipo_frequenza": "fisso",
            "intervallo_ore": None,
            "intervallo_minimo_ore": None,
            "dosi_giornaliere": 1,
            "relazione_pasto": "indifferente",
            "dettaglio_pasto": None,
            "note": None,
            "data_inizio": date.today(),
            "data_fine": None,
            "attivo": True,
            "demo": False,
        }
        defaults.update(overrides)
        conn = db_test_pool.get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO farmaci ("
                "utente_id, nome, principio_attivo, funzione, tipo_frequenza, "
                "intervallo_ore, intervallo_minimo_ore, dosi_giornaliere, relazione_pasto, "
                "dettaglio_pasto, note, data_inizio, data_fine, attivo, demo"
                ") VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    utente_id,
                    nome,
                    defaults["principio_attivo"],
                    defaults["funzione"],
                    defaults["tipo_frequenza"],
                    defaults["intervallo_ore"],
                    defaults["intervallo_minimo_ore"],
                    defaults["dosi_giornaliere"],
                    defaults["relazione_pasto"],
                    defaults["dettaglio_pasto"],
                    defaults["note"],
                    defaults["data_inizio"],
                    defaults["data_fine"],
                    defaults["attivo"],
                    defaults["demo"],
                ),
            )
            farmaco_id = cur.lastrowid
            conn.commit()
            cur.close()
        finally:
            conn.close()
        return farmaco_id

    return _insert


@pytest.fixture
def client(db_test_pool: MySQLConnectionPool) -> Generator[TestClient, None, None]:
    """FastAPI TestClient with get_db override.

    No context manager -> lifespan startup/shutdown NOT triggered, so init_pool()
    does not overwrite the patched _pool from db_test_pool fixture.
    """
    def override_get_db():
        conn = db_test_pool.get_connection()
        try:
            yield conn
        finally:
            conn.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
