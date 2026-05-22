"""
PharmaTimer F3-S1-bis Step 4 CP1-code
MySQL connection pool via mysql-connector-python.
Pool initialized at FastAPI startup (lifespan), torn down at shutdown.
sub-AMB F3-S1.C default pool_size=5.
"""
from mysql.connector import pooling
from mysql.connector.pooling import MySQLConnectionPool, PooledMySQLConnection

from pharmatimer_api.config import settings

_pool: MySQLConnectionPool | None = None


def init_pool() -> None:
    """Initialize global connection pool. Called once at startup."""
    global _pool
    if _pool is not None:
        return
    _pool = pooling.MySQLConnectionPool(
        pool_name="pharmatimer_pool",
        pool_size=settings.DB_POOL_SIZE,
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME,
        charset="utf8mb4",
        collation="utf8mb4_unicode_ci",
        autocommit=False,
    )


def close_pool() -> None:
    """Tear down global pool. Called at shutdown."""
    global _pool
    _pool = None


def get_connection() -> PooledMySQLConnection:
    """Acquire a pooled connection. Caller MUST .close() to release back to pool."""
    if _pool is None:
        raise RuntimeError("Connection pool not initialized")
    return _pool.get_connection()


def db_ping() -> bool:
    """Liveness check: acquire connection, ping, release. Returns True if reachable."""
    try:
        conn = get_connection()
        try:
            conn.ping(reconnect=False, attempts=1, delay=0)
            return True
        finally:
            conn.close()
    except Exception:
        return False
