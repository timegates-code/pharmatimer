"""
PharmaTimer F3-S1-bis-delta CP3
FastAPI dependencies:
- get_db: yields pooled connection
- get_current_user: SHA-256 hash check vs utenti.token_hash (Spec sez. 9)
"""
# CP3 F3-S1-bis-delta SENTINEL get_current_user
import hashlib
from typing import Generator

from fastapi import Depends, Header, HTTPException, status
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token non valido o utente disattivato",
        )

    return CurrentUser(
        id=row["id"],
        nome_visualizzato=row["nome_visualizzato"],
        ruolo=row["ruolo"],
    )
