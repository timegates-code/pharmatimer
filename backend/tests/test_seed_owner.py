"""
PharmaTimer F3-S1-bis-delta parte 2/2 CP4
Tests for seed_owner.py CLI script (idempotency + token format).

Strategy: subprocess invocation with DB_NAME overridden via env var to
point seed_owner.py at pharmatimer_test (pydantic-settings env > .env.dev).
"""
import hashlib
import os
import subprocess
import sys
from pathlib import Path
from typing import Tuple

from mysql.connector.pooling import MySQLConnectionPool


BACKEND_DIR = Path(__file__).parent.parent


def _run_seed_owner(owner_name: str) -> subprocess.CompletedProcess:
    """Invoke seed_owner.py with DB_NAME overridden to pharmatimer_test."""
    env = os.environ.copy()
    env["OWNER_NAME"] = owner_name
    env["DB_NAME"] = "pharmatimer_test"
    return subprocess.run(
        [sys.executable, "seed_owner.py"],
        cwd=str(BACKEND_DIR),
        env=env,
        capture_output=True,
        text=True,
    )


def test_seed_owner_idempotent(db_test_pool: MySQLConnectionPool, seed_owner_test: Tuple[str, int]) -> None:
    """Second invocation refuses with exit 1 + stderr 'Owner gia esistente'."""
    # seed_owner_test fixture already created an owner in pharmatimer_test
    result = _run_seed_owner(owner_name="SecondOwner")

    assert result.returncode == 1, (
        f"Expected exit 1, got {result.returncode}. "
        f"stdout={result.stdout!r} stderr={result.stderr!r}"
    )
    assert "Owner gia esistente" in result.stderr


def test_seed_owner_token_format(db_test_pool: MySQLConnectionPool) -> None:
    """Token output is 43 chars base64url; DB stores SHA-256 (64 hex) of plaintext."""
    # No seed_owner_test fixture -> cleanup autouse pulisce, subprocess crea owner
    result = _run_seed_owner(owner_name="TokenFormatTest")

    assert result.returncode == 0, (
        f"Expected exit 0, got {result.returncode}. "
        f"stdout={result.stdout!r} stderr={result.stderr!r}"
    )

    # Extract token: line after "non sara mostrato di nuovo"
    lines = [line for line in result.stdout.split("\n") if line.strip()]
    token_line_idx = None
    for i, line in enumerate(lines):
        if "non sara mostrato di nuovo" in line:
            token_line_idx = i + 1
            break

    assert token_line_idx is not None, f"Token marker not found in stdout: {result.stdout!r}"
    assert token_line_idx < len(lines), "Token line missing after marker"
    token = lines[token_line_idx].strip()

    # 32 bytes URL-safe base64 -> 43 chars (no padding)
    assert len(token) == 43, f"Token length {len(token)} != 43: {token!r}"

    # Verify SHA-256 hash matches DB storage
    expected_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    assert len(expected_hash) == 64

    conn = db_test_pool.get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT token_hash FROM utenti WHERE nome_visualizzato = %s",
            ("TokenFormatTest",),
        )
        row = cur.fetchone()
        cur.close()
    finally:
        conn.close()

    assert row is not None, "Owner row not found in DB after seed_owner.py"
    assert row[0] == expected_hash, f"Hash mismatch: DB={row[0]!r} computed={expected_hash!r}"
