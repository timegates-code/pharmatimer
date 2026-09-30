"""
PharmaTimer F3-S1-bis Step 4 CP1-code (refactored N+5.M-pivot-exec-beta-1)
MySQL connection pool via mysql-connector-python.
Pool initialized at FastAPI startup (lifespan), torn down at shutdown.
sub-AMB F3-S1.C default pool_size=5.

N+5.M-pivot-exec-beta-1 refactor (s.6.NN-Fase3 Q-I.1=(b)):
- Conditional option_files vs user+password based on settings.DB_DEFAULTS_FILE
- DB_NAME passed explicitly even in defaults-file mode (override [client] section)

SENTINEL_N5M_PIVOT_EXEC_BETA1_BACKEND_REFACTOR_APPLIED
"""
import random
import time

import mysql.connector
from mysql.connector import pooling
from mysql.connector.errors import PoolError
from mysql.connector.pooling import MySQLConnectionPool, PooledMySQLConnection

from pharmatimer_api.config import settings

_pool: MySQLConnectionPool | None = None

# ANOM-1 (par.196): bounded retry on pool exhaustion under burst load.
# SENTINEL_ANOM1_PAR196_RETRY_APPLIED
POOL_ACQUIRE_MAX_ATTEMPTS = 3
POOL_ACQUIRE_BASE_DELAY_S = 0.05
POOL_ACQUIRE_JITTER_S = 0.025


def _parametri_connessione() -> dict:
    """The one seat of the connection parameters, for the pool and for the planner."""
    kwargs = {
        "host": settings.DB_HOST,
        "port": settings.DB_PORT,
        "database": settings.DB_NAME,
        "charset": "utf8mb4",
        "collation": "utf8mb4_unicode_ci",
        "autocommit": False,
    }
    if settings.DB_DEFAULTS_FILE:
        kwargs["option_files"] = settings.DB_DEFAULTS_FILE
    else:
        kwargs["user"] = settings.DB_USER
        kwargs["password"] = settings.DB_PASSWORD
    return kwargs


def init_pool() -> None:
    """Initialize global connection pool. Called once at startup."""
    global _pool
    if _pool is not None:
        return
    _pool = pooling.MySQLConnectionPool(
        pool_name="pharmatimer_pool",
        pool_size=settings.DB_POOL_SIZE,
        **_parametri_connessione(),
    )


def apri_connessione():
    """One plain connection with the pool's parameters, autocommit off.

    For the planner (pianificatore.py): a process that lives a few seconds
    every minute has no use for a pool, which opens all its connections at
    creation. Caller MUST .close() it.
    """
    return mysql.connector.connect(**_parametri_connessione())


def close_pool() -> None:
    """Tear down global pool. Called at shutdown."""
    global _pool
    _pool = None


def get_connection() -> PooledMySQLConnection:
    """Acquire a pooled connection with bounded retry on pool exhaustion.

    Caller MUST .close() to release back to pool. On a transient PoolError
    (pool exhausted under burst load, ANOM-1 par.196) retries up to
    POOL_ACQUIRE_MAX_ATTEMPTS times with exponential backoff plus jitter,
    then re-raises PoolError so the caller still surfaces the existing
    500 DB_UNAVAILABLE response.
    """
    if _pool is None:
        raise RuntimeError("Connection pool not initialized")
    for attempt in range(1, POOL_ACQUIRE_MAX_ATTEMPTS + 1):
        try:
            return _pool.get_connection()
        except PoolError:
            if attempt >= POOL_ACQUIRE_MAX_ATTEMPTS:
                raise
            delay = POOL_ACQUIRE_BASE_DELAY_S * (2 ** (attempt - 1))
            delay += random.uniform(0.0, POOL_ACQUIRE_JITTER_S)
            time.sleep(delay)


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
