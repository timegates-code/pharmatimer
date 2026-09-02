"""Test suite CRUD permessi caregiver scoped admin-on-paziente.

NEW F3-S4-beta N+5.E-beta CP1 -- 15 test (backend cumulativo 75/75).
CP2-FIX1 N+5.E-beta -- fixture pattern aligned a conftest seed_owner_test (Tuple[str, int]).

Fixtures from conftest.py:
  - client: FastAPI TestClient
  - seed_owner_test: Tuple[owner_token, owner_id] (idempotent seed)
"""
# SENTINEL_N5E_BETA_CP1_TESTS_PERMESSI_CRUD
# SENTINEL_N5E_BETA_CP2_FIX1_TESTS_FIXTURE_PATTERN
from __future__ import annotations

import pytest

# ============================================================
# Helper fixtures
# ============================================================


@pytest.fixture
def caregiver_and_paziente(client, seed_owner_test):
    """Create a caregiver + paziente via owner. Returns (caregiver, paziente) dicts."""
    owner_token, _ = seed_owner_test
    headers = {"X-User-Token": owner_token}

    r_cg = client.post(
        "/api/utenti",
        json={"nome_visualizzato": "TestCaregiverBeta", "ruolo": "caregiver"},
        headers=headers,
    )
    assert r_cg.status_code == 201, r_cg.text
    caregiver = r_cg.json()

    r_pz = client.post(
        "/api/utenti",
        json={"nome_visualizzato": "TestPazienteBeta", "ruolo": "paziente"},
        headers=headers,
    )
    assert r_pz.status_code == 201, r_pz.text
    paziente = r_pz.json()

    return caregiver, paziente


def _find_self_permesso_id(client, owner_token, utente_id):
    """Find the self-permesso row id for utente (caregiver_id == paziente_id == utente_id)."""
    r = client.get("/api/permessi", headers={"X-User-Token": owner_token})
    assert r.status_code == 200, r.text
    for row in r.json():
        if row["caregiver_id"] == utente_id and row["paziente_id"] == utente_id:
            return row["id"]
    return None


# ============================================================
# GET /api/permessi (2 test)
# ============================================================


def test_get_permessi_baseline_list(client, seed_owner_test):
    """Owner GET returns list (may contain pre-existing rows)."""
    owner_token, _ = seed_owner_test
    r = client.get("/api/permessi", headers={"X-User-Token": owner_token})
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    for row in body:
        assert "id" in row
        assert "caregiver_id" in row
        assert "paziente_id" in row
        assert "permesso" in row
        assert row["permesso"] in {"read", "write", "admin"}


def test_get_permessi_bidirectional(client, seed_owner_test, caregiver_and_paziente):
    """GET returns rows where current is caregiver OR paziente."""
    owner_token, _ = seed_owner_test
    caregiver, paziente = caregiver_and_paziente

    r_grant = client.post(
        "/api/permessi",
        json={
            "caregiver_id": caregiver["id"],
            "paziente_id": paziente["id"],
            "permesso": "read",
        },
        headers={"X-User-Token": owner_token},
    )
    assert r_grant.status_code == 201, r_grant.text

    r = client.get("/api/permessi", headers={"X-User-Token": caregiver["token_plain"]})
    assert r.status_code == 200
    rows = r.json()
    assert any(
        row["caregiver_id"] == caregiver["id"] and row["paziente_id"] == paziente["id"]
        for row in rows
    ), "Expected new grant row visible to caregiver (bidirectional)"


# ============================================================
# POST /api/permessi (5 test)
# ============================================================


def test_post_permesso_happy_admin(client, seed_owner_test, caregiver_and_paziente):
    """Owner (admin globally) grants permesso -> 201."""
    owner_token, _ = seed_owner_test
    caregiver, paziente = caregiver_and_paziente
    r = client.post(
        "/api/permessi",
        json={
            "caregiver_id": caregiver["id"],
            "paziente_id": paziente["id"],
            "permesso": "write",
            "notifiche_caregiver_attive": True,
        },
        headers={"X-User-Token": owner_token},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["caregiver_id"] == caregiver["id"]
    assert body["paziente_id"] == paziente["id"]
    assert body["permesso"] == "write"
    assert body["notifiche_caregiver_attive"] is True


def test_post_permesso_duplicate_unique(client, seed_owner_test, caregiver_and_paziente):
    """Re-POST same (caregiver_id, paziente_id) -> 409 CONSTRAINT_VIOLATION."""
    owner_token, _ = seed_owner_test
    caregiver, paziente = caregiver_and_paziente
    headers = {"X-User-Token": owner_token}
    payload = {
        "caregiver_id": caregiver["id"],
        "paziente_id": paziente["id"],
        "permesso": "read",
    }
    r1 = client.post("/api/permessi", json=payload, headers=headers)
    assert r1.status_code == 201, r1.text
    r2 = client.post("/api/permessi", json=payload, headers=headers)
    assert r2.status_code == 409, r2.text


def test_post_permesso_fk_violation(client, seed_owner_test):
    """Non-existent caregiver_id/paziente_id -> 404 NOT_FOUND."""
    owner_token, _ = seed_owner_test
    r = client.post(
        "/api/permessi",
        json={
            "caregiver_id": 999999,
            "paziente_id": 999998,
            "permesso": "read",
        },
        headers={"X-User-Token": owner_token},
    )
    assert r.status_code == 404, r.text


def test_post_permesso_not_admin_forbidden(client, caregiver_and_paziente):
    """Caregiver without admin tries to grant -> 403 FORBIDDEN."""
    caregiver, paziente = caregiver_and_paziente
    r = client.post(
        "/api/permessi",
        json={
            "caregiver_id": caregiver["id"],
            "paziente_id": paziente["id"],
            "permesso": "read",
        },
        headers={"X-User-Token": caregiver["token_plain"]},
    )
    assert r.status_code == 403, r.text


def test_post_permesso_invalid_enum(client, seed_owner_test, caregiver_and_paziente):
    """Pydantic Literal rejects 'superadmin' -> 422 Validation Error."""
    owner_token, _ = seed_owner_test
    caregiver, paziente = caregiver_and_paziente
    r = client.post(
        "/api/permessi",
        json={
            "caregiver_id": caregiver["id"],
            "paziente_id": paziente["id"],
            "permesso": "superadmin",
        },
        headers={"X-User-Token": owner_token},
    )
    assert r.status_code == 422, r.text


# ============================================================
# PUT /api/permessi/{id} (4 test)
# ============================================================


def test_put_permesso_update_permesso(client, seed_owner_test, caregiver_and_paziente):
    """Update permesso from read to write -> 200."""
    owner_token, _ = seed_owner_test
    caregiver, paziente = caregiver_and_paziente
    headers = {"X-User-Token": owner_token}
    r_create = client.post(
        "/api/permessi",
        json={
            "caregiver_id": caregiver["id"],
            "paziente_id": paziente["id"],
            "permesso": "read",
        },
        headers=headers,
    )
    permesso_id = r_create.json()["id"]

    r_update = client.put(
        f"/api/permessi/{permesso_id}",
        json={"permesso": "write"},
        headers=headers,
    )
    assert r_update.status_code == 200, r_update.text
    assert r_update.json()["permesso"] == "write"


def test_put_permesso_update_notifiche_only(client, seed_owner_test, caregiver_and_paziente):
    """Update notifiche_caregiver_attive only -> 200, permesso invariato."""
    owner_token, _ = seed_owner_test
    caregiver, paziente = caregiver_and_paziente
    headers = {"X-User-Token": owner_token}
    r_create = client.post(
        "/api/permessi",
        json={
            "caregiver_id": caregiver["id"],
            "paziente_id": paziente["id"],
            "permesso": "admin",
        },
        headers=headers,
    )
    permesso_id = r_create.json()["id"]

    r_update = client.put(
        f"/api/permessi/{permesso_id}",
        json={"notifiche_caregiver_attive": True},
        headers=headers,
    )
    assert r_update.status_code == 200, r_update.text
    body = r_update.json()
    assert body["notifiche_caregiver_attive"] is True
    assert body["permesso"] == "admin"


def test_put_permesso_not_found(client, seed_owner_test):
    """PUT on non-existent id -> 404."""
    owner_token, _ = seed_owner_test
    r = client.put(
        "/api/permessi/999999",
        json={"permesso": "write"},
        headers={"X-User-Token": owner_token},
    )
    assert r.status_code == 404, r.text


def test_put_permesso_not_admin_forbidden(client, seed_owner_test, caregiver_and_paziente):
    """Non-admin tries to update -> 403."""
    owner_token, _ = seed_owner_test
    caregiver, paziente = caregiver_and_paziente
    r_create = client.post(
        "/api/permessi",
        json={
            "caregiver_id": caregiver["id"],
            "paziente_id": paziente["id"],
            "permesso": "read",
        },
        headers={"X-User-Token": owner_token},
    )
    permesso_id = r_create.json()["id"]

    r_update = client.put(
        f"/api/permessi/{permesso_id}",
        json={"permesso": "admin"},
        headers={"X-User-Token": caregiver["token_plain"]},
    )
    assert r_update.status_code == 403, r_update.text


# ============================================================
# DELETE /api/permessi/{id} (4 test)
# ============================================================


def test_delete_permesso_happy(client, seed_owner_test, caregiver_and_paziente):
    """Admin deletes permesso -> 200 + row sparita."""
    owner_token, _ = seed_owner_test
    caregiver, paziente = caregiver_and_paziente
    headers = {"X-User-Token": owner_token}
    r_create = client.post(
        "/api/permessi",
        json={
            "caregiver_id": caregiver["id"],
            "paziente_id": paziente["id"],
            "permesso": "read",
        },
        headers=headers,
    )
    permesso_id = r_create.json()["id"]

    r_delete = client.delete(f"/api/permessi/{permesso_id}", headers=headers)
    assert r_delete.status_code == 200, r_delete.text
    assert r_delete.json() == {"deleted": True, "id": permesso_id}

    r_check = client.put(
        f"/api/permessi/{permesso_id}",
        json={"permesso": "write"},
        headers=headers,
    )
    assert r_check.status_code == 404


def test_delete_permesso_self_protection(client, seed_owner_test, caregiver_and_paziente):
    """DELETE on self-permesso (caregiver_id == paziente_id) -> 409."""
    owner_token, _ = seed_owner_test
    caregiver, _ = caregiver_and_paziente
    # SENTINEL_N5E_BETA_CP2_FIX2_TESTS_CAREGIVER_TOKEN -- CP2-FIX2: usa token caregiver (bidirezionale scope) fix cp2-err-N3
    self_id = _find_self_permesso_id(client, caregiver["token_plain"], caregiver["id"])
    assert self_id is not None, "Self-permesso row not found for caregiver"

    r = client.delete(
        f"/api/permessi/{self_id}",
        headers={"X-User-Token": owner_token},
    )
    assert r.status_code == 409, r.text


def test_delete_permesso_not_found(client, seed_owner_test):
    """DELETE non-existent -> 404."""
    owner_token, _ = seed_owner_test
    r = client.delete("/api/permessi/999999", headers={"X-User-Token": owner_token})
    assert r.status_code == 404, r.text


def test_delete_permesso_not_admin_forbidden(client, seed_owner_test, caregiver_and_paziente):
    """Non-admin tries to delete -> 403."""
    owner_token, _ = seed_owner_test
    caregiver, paziente = caregiver_and_paziente
    r_create = client.post(
        "/api/permessi",
        json={
            "caregiver_id": caregiver["id"],
            "paziente_id": paziente["id"],
            "permesso": "read",
        },
        headers={"X-User-Token": owner_token},
    )
    permesso_id = r_create.json()["id"]

    r_delete = client.delete(
        f"/api/permessi/{permesso_id}",
        headers={"X-User-Token": caregiver["token_plain"]},
    )
    assert r_delete.status_code == 403, r_delete.text
