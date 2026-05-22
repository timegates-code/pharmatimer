"""
PharmaTimer F3-S1-bis-delta parte 2/2 CP4
Tests for GET /api/farmaci (auth-scoped read endpoint).
Validates: empty user, scoped per utente_id (no leak), inactive excluded, ordered by nome.
"""
from typing import Callable, Tuple

from fastapi.testclient import TestClient


def test_farmaci_empty_user(client: TestClient, seed_owner_test: Tuple[str, int]) -> None:
    """User with no farmaci receives 200 + empty list."""
    token, _ = seed_owner_test
    response = client.get("/api/farmaci", headers={"X-User-Token": token})
    assert response.status_code == 200
    assert response.json() == []


def test_farmaci_scoped_utente(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_user: Callable[..., Tuple[str, int]],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """User A token returns only farmaci of user A (no leak of user B farmaci)."""
    token_a, owner_id = seed_owner_test
    _, user_b_id = insert_test_user(nome="UserB", ruolo="paziente")

    insert_test_farmaco(utente_id=owner_id, nome="FarmacoOwner")
    insert_test_farmaco(utente_id=user_b_id, nome="FarmacoUserB")

    response = client.get("/api/farmaci", headers={"X-User-Token": token_a})
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["nome"] == "FarmacoOwner"
    assert items[0]["utente_id"] == owner_id


def test_farmaci_inactive_excluded(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Farmaci with attivo=FALSE are excluded from response."""
    token, owner_id = seed_owner_test
    insert_test_farmaco(utente_id=owner_id, nome="Attivo", attivo=True)
    insert_test_farmaco(utente_id=owner_id, nome="Inattivo", attivo=False)

    response = client.get("/api/farmaci", headers={"X-User-Token": token})
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["nome"] == "Attivo"


def test_farmaci_ordered_by_nome(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Response is ordered by nome ASC regardless of insertion order."""
    token, owner_id = seed_owner_test
    for nome in ["Charlie", "Alpha", "Bravo"]:
        insert_test_farmaco(utente_id=owner_id, nome=nome)

    response = client.get("/api/farmaci", headers={"X-User-Token": token})
    assert response.status_code == 200
    items = response.json()
    assert [item["nome"] for item in items] == ["Alpha", "Bravo", "Charlie"]
