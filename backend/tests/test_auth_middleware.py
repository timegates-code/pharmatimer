"""
PharmaTimer F3-S1-bis-delta parte 2/2 CP4
Tests for get_current_user middleware (X-User-Token SHA-256 hash check).
Spec sez. 9 + dependencies.py.
"""
import hashlib
from typing import Callable, Tuple

from fastapi.testclient import TestClient


def test_auth_happy_path(client: TestClient, seed_owner_test: Tuple[str, int]) -> None:
    """Valid token resolves to CurrentUser and grants 200 on protected endpoint."""
    token, _ = seed_owner_test
    response = client.get("/api/farmaci", headers={"X-User-Token": token})
    assert response.status_code == 200


def test_auth_no_header(client: TestClient) -> None:
    """Missing X-User-Token header returns 422 Pydantic validation."""
    response = client.get("/api/farmaci")
    assert response.status_code == 422


def test_auth_invalid_token(client: TestClient, seed_owner_test: Tuple[str, int]) -> None:
    """Wrong token returns 401 with RepositoryError vocabulary body (post-N+5.K)."""
    # SENTINEL_N5K_CP1_TEST_INVALID_TOKEN_VOCABULARY drift-N44+N53 symmetric closure
    response = client.get("/api/farmaci", headers={"X-User-Token": "wrong-token-value"})
    assert response.status_code == 401
    body = response.json()
    assert body["error"]["code"] == "UNAUTHORIZED"
    assert "Token non valido" in body["error"]["message"]


def test_auth_inactive_user(client: TestClient, insert_test_user: Callable[..., Tuple[str, int]]) -> None:
    """Inactive user (attivo=FALSE) returns 401 (no leak of user existence)."""
    token, _ = insert_test_user(nome="Inactive", ruolo="paziente", attivo=False)
    response = client.get("/api/farmaci", headers={"X-User-Token": token})
    assert response.status_code == 401


# SENTINEL_N5K_CP1_TEST_INVALID_TOKEN_VOCABULARY_SYMMETRY_NEW vocabulary cross-handler symmetry smoke
def test_auth_invalid_token_vocabulary_symmetry(
    client: TestClient, seed_owner_test: Tuple[str, int]
) -> None:
    """N+5.K smoke vocabulary symmetry: 401 body shape mirrors FORBIDDEN/NOT_FOUND."""
    response = client.get("/api/farmaci", headers={"X-User-Token": "wrong-token"})
    assert response.status_code == 401
    body = response.json()
    assert "error" in body
    assert body["error"]["code"] == "UNAUTHORIZED"
    assert body["error"]["severity"] == "error"
    assert isinstance(body["error"]["message"], str)
    assert len(body["error"]["message"]) > 0


def test_auth_token_hash_sha256() -> None:
    """SHA-256 hash of plaintext token has deterministic 64 hex chars output."""
    token = "test-plaintext-token-12345"
    expected = hashlib.sha256(token.encode("utf-8")).hexdigest()

    assert len(expected) == 64
    assert all(c in "0123456789abcdef" for c in expected)
    assert expected == hashlib.sha256(token.encode("utf-8")).hexdigest()
