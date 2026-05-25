"""
PharmaTimer F3-S1-bis-delta CP3
FastAPI dependencies:
- get_db: yields pooled connection
- get_current_user: SHA-256 hash check vs utenti.token_hash (Spec sez. 9)
"""
# CP3 F3-S1-bis-delta SENTINEL get_current_user
import hashlib
from typing import Generator

from fastapi import Depends, Header  # SENTINEL_N5K_CP1_DEPS_IMPORT_CLEANUP_HTTPEXCEPTION removed HTTPException+status post-N+5.K
from mysql.connector.pooling import PooledMySQLConnection
from pydantic import BaseModel

from pharmatimer_api.db.connection import get_connection


class CurrentUser(BaseModel):
    """Authenticated user resolved from X-User-Token header."""

    id: int
    nome_visualizzato: str
    ruolo: str


def get_db() -> Generator[PooledMySQLConnection, None, None]:
    """FastAPI dependency: yield pooled connection, auto-close on response end."""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def get_current_user(
    x_user_token: str = Header(..., alias="X-User-Token"),
    conn: PooledMySQLConnection = Depends(get_db),
) -> CurrentUser:
    """Resolve X-User-Token header to CurrentUser via SHA-256 hash match.

    Raises 401 Unauthorized when token does not match any active utenti row.
    FastAPI returns 422 automatically when X-User-Token header missing.
    """
    token_hash = hashlib.sha256(x_user_token.encode("utf-8")).hexdigest()

    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT id, nome_visualizzato, ruolo "
            "FROM utenti WHERE token_hash = %s AND attivo = TRUE LIMIT 1",
            (token_hash,),
        )
        row = cur.fetchone()
    finally:
        cur.close()

    if row is None:
        # SENTINEL_N5K_CP1_DEPS_GET_CURRENT_USER_RAISE_VOCABULARY drift-N44+N53 backend-side symmetric closure par.22.93
        from pharmatimer_api.exceptions import RepositoryError, RepositoryErrorCode
        raise RepositoryError(
            code=RepositoryErrorCode.UNAUTHORIZED,
            message="Token non valido o utente disattivato",
        )

    return CurrentUser(
        id=row["id"],
        nome_visualizzato=row["nome_visualizzato"],
        ruolo=row["ruolo"],
    )



def get_current_owner(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Resolve current user and assert ruolo='owner'.

    Asymmetry historical: par.22.86 drift-N44 emit pre-CP1 N+5.E-alpha
    (deferred allora F3-S5+). Risolta simmetricamente N+5.K par.22.93
    (`get_current_user` raise RepositoryError(UNAUTHORIZED) ora, vocabulary
    uniform via global handler par.22.34). SENTINEL_N5K_CP1_DEPS_DRIFT_N59_REF_FIX

    Raises 403 Forbidden (via RepositoryError) when authenticated user is
    not the database owner. Spec sez. 11.6 enforces "1 owner per DB" via
    Pydantic Literal at POST and via this guard at runtime.

    CP1 F3-S4-alpha N+5.E-alpha applied SENTINEL
    """
    if current_user.ruolo != "owner":
        from pharmatimer_api.exceptions import (
            RepositoryError,
            RepositoryErrorCode,
        )
        raise RepositoryError(
            code=RepositoryErrorCode.FORBIDDEN,
            message="Operazione riservata a owner",
        )
    return current_user


# SENTINEL_N5E_BETA_CP1_DEPS_ASSERT_ADMIN_ON_PAZIENTE
# F3-S4-beta N+5.E-beta CP1 -- helper assert_admin_on_paziente
#
# Pattern Lesson #25 autocommit-aware: SELECT-only, no commit needed.
# Owner role bypasses check globally (admin access by definition).
def assert_admin_on_paziente(
    current_user: "CurrentUser",
    paziente_id: int,
    conn,
) -> None:
    """Assert current_user has 'admin' permesso on paziente_id (or is owner).

    Raises:
      RepositoryError(FORBIDDEN) if current_user lacks admin permesso
      on the target paziente_id. Owner role is exempt (admin globally).
    """
    # SENTINEL_N5E_BETA_CP2_FIX2_DEPS_LOCAL_IMPORT -- CP2-FIX2: local import fix NameError cp2-err-N2
    from pharmatimer_api.exceptions import RepositoryError, RepositoryErrorCode
    if current_user.ruolo == "owner":
        return
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT 1 FROM permessi
            WHERE caregiver_id = %s
              AND paziente_id = %s
              AND permesso = 'admin'
            LIMIT 1
            """,
            (current_user.id, paziente_id),
        )
        if cursor.fetchone() is None:
            raise RepositoryError(
                RepositoryErrorCode.FORBIDDEN,
                f"Permesso admin richiesto su paziente_id={paziente_id}",
            )
    finally:
        cursor.close()
