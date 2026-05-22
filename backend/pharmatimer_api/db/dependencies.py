"""
PharmaTimer F3-S1-bis Step 4 CP1-code
FastAPI dependency placeholders.
get_current_user middleware deferred to CP3 (par.11.D-S1.bis F3-S1-bis-gamma).
"""
from typing import Generator

from mysql.connector.pooling import PooledMySQLConnection

from pharmatimer_api.db.connection import get_connection


def get_db() -> Generator[PooledMySQLConnection, None, None]:
    """FastAPI dependency: yield pooled connection, auto-close on response end."""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
