"""
PharmaTimer F3-S4-alpha CP1 N+5.E-alpha (refactored CP2-FIX)
Pytest cases for /api/utenti POST + DELETE endpoints.

CP2-FIX refactor (par.22.86 closing finding cp2-err-N1):
  Original emit assumed wrapper fixtures that do not exist in conftest.py
  par.22.80 F3-S1-bis-delta CP4 baseline. Refactored to use seed_owner_test
  (returns Tuple[token_plain, id]) and insert_test_user (factory returning
  Tuple[token_plain, id]).

Test plan (par.11.I-S3 + par.22.85):
  POST happy paziente -> 201 + token_plain + double-INSERT permessi
  POST happy caregiver -> 201 + token_plain + double-INSERT permessi
  POST 422 ruolo='owner' Pydantic Literal rejection
  POST default ruolo paziente
  POST 403 non-owner (paziente attempts)
  POST token_plain format 43-char base64url + uniqueness
  DELETE 200 happy + verify attivo=FALSE
  DELETE 200 idempotent on already-deactivated (Q7c)
  DELETE 409 owner-attempt (Q7a)
  DELETE 404 non-existent id
  DELETE 403 non-owner

Lesson #19: TestClient WITHOUT context-manager (conftest fixture preserved).

CP1 F3-S4-alpha N+5.E-alpha NEW SENTINEL
CP2 FIX fixture refactor SENTINEL
"""
from __future__ import annotations

import re

BASE64URL_TOKEN_RE = re.compile(r"^[A-Za-z0-9_\-]{43}$")


# ----- POST happy paths -----


def test_post_utente_paziente_happy(client, seed_owner_test, db_test_pool):
    """Owner crea paziente -> 201 + body + double-INSERT permessi."""
    owner_token, owner_id = seed_owner_test
    resp = client.post(
        "/api/utenti",
        headers={"X-User-Token": owner_token},
        json={"nome_visualizzato": "Mario Rossi", "ruolo": "paziente"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["nome_visualizzato"] == "Mario Rossi"
    assert body["ruolo"] == "paziente"
    assert body["attivo"] is True
    assert "token_plain" in body
    assert BASE64URL_TOKEN_RE.match(body["token_plain"])

    new_id = body["id"]
    conn = db_test_pool.get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT COUNT(*) AS c FROM permessi WHERE paziente_id = %s",
            (new_id,),
        )
        assert cur.fetchone()["c"] == 2, "Expected double INSERT (self + owner)"

        cur.execute(
            "SELECT caregiver_id, permesso FROM permessi "
            "WHERE paziente_id = %s ORDER BY caregiver_id",
            (new_id,),
        )
        rows = cur.fetchall()
        permessi_set = {(r["caregiver_id"], r["permesso"]) for r in rows}
        assert (new_id, "admin") in permessi_set, "self-permesso missing"
        assert (owner_id, "admin") in permessi_set, "owner-permesso missing"
        cur.close()
    finally:
        conn.close()


def test_post_utente_caregiver_happy(client, seed_owner_test, db_test_pool):
    """Owner crea caregiver -> 201 + verify both permessi rows."""
    owner_token, owner_id = seed_owner_test
    resp = client.post(
        "/api/utenti",
        headers={"X-User-Token": owner_token},
        json={"nome_visualizzato": "Luigi Bianchi", "ruolo": "caregiver"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["ruolo"] == "caregiver"
    assert BASE64URL_TOKEN_RE.match(body["token_plain"])

    new_id = body["id"]
    conn = db_test_pool.get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT COUNT(*) AS c FROM permessi WHERE paziente_id = %s",
            (new_id,),
        )
        assert cur.fetchone()["c"] == 2
        cur.close()
    finally:
        conn.close()


# ----- POST validation + auth -----


def test_post_utente_ruolo_owner_rejected(client, seed_owner_test):
    """Pydantic Literal rejects ruolo='owner' -> 422."""
    owner_token, _ = seed_owner_test
    resp = client.post(
        "/api/utenti",
        headers={"X-User-Token": owner_token},
        json={"nome_visualizzato": "Hacker", "ruolo": "owner"},
    )
    assert resp.status_code == 422


def test_post_utente_default_ruolo_paziente(client, seed_owner_test):
    """Omitting ruolo defaults to 'paziente'."""
    owner_token, _ = seed_owner_test
    resp = client.post(
        "/api/utenti",
        headers={"X-User-Token": owner_token},
        json={"nome_visualizzato": "Anna"},
    )
    assert resp.status_code == 201
    assert resp.json()["ruolo"] == "paziente"


def test_post_utente_non_owner_forbidden(client, seed_owner_test, insert_test_user):
    """Paziente attempts POST -> 403 FORBIDDEN body shape."""
    # seed_owner_test required to ensure owner exists in TRUNCATE-d table
    _ = seed_owner_test
    paziente_token, _ = insert_test_user(nome="Paziente Test", ruolo="paziente")
    resp = client.post(
        "/api/utenti",
        headers={"X-User-Token": paziente_token},
        json={"nome_visualizzato": "Should Fail", "ruolo": "paziente"},
    )
    assert resp.status_code == 403
    body = resp.json()
    assert body["error"]["code"] == "FORBIDDEN"
    assert body["error"]["severity"] == "warning"


def test_post_utente_token_plain_one_shot_format(client, seed_owner_test):
    """Verify token_plain is 43-char base64url and unique across calls."""
    owner_token, _ = seed_owner_test
    tokens = set()
    for nome in ("U1", "U2", "U3"):
        resp = client.post(
            "/api/utenti",
            headers={"X-User-Token": owner_token},
            json={"nome_visualizzato": nome},
        )
        assert resp.status_code == 201
        token = resp.json()["token_plain"]
        assert BASE64URL_TOKEN_RE.match(token), f"Token format invalid: {token!r}"
        tokens.add(token)
    assert len(tokens) == 3, "Tokens must be unique"


def test_post_utente_nome_visualizzato_boundary(client, seed_owner_test):
    """nome_visualizzato boundary allineato a DB varchar(50): 50 ok, 51 -> 422."""
    owner_token, _ = seed_owner_test

    ok_resp = client.post(
        "/api/utenti",
        headers={"X-User-Token": owner_token},
        json={"nome_visualizzato": "x" * 50},
    )
    assert ok_resp.status_code == 201, ok_resp.text
    assert ok_resp.json()["nome_visualizzato"] == "x" * 50

    too_long_resp = client.post(
        "/api/utenti",
        headers={"X-User-Token": owner_token},
        json={"nome_visualizzato": "x" * 51},
    )
    assert too_long_resp.status_code == 422


# ----- DELETE happy + idempotent -----


def test_delete_utente_happy(client, seed_owner_test, db_test_pool):
    """Create paziente then DELETE -> 200 + verify attivo=FALSE."""
    owner_token, _ = seed_owner_test
    create_resp = client.post(
        "/api/utenti",
        headers={"X-User-Token": owner_token},
        json={"nome_visualizzato": "ToDelete"},
    )
    target_id = create_resp.json()["id"]

    del_resp = client.delete(
        f"/api/utenti/{target_id}",
        headers={"X-User-Token": owner_token},
    )
    assert del_resp.status_code == 200
    assert del_resp.json()["attivo"] is False
    assert del_resp.json()["idempotent_noop"] is False

    conn = db_test_pool.get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT attivo FROM utenti WHERE id = %s", (target_id,))
        assert bool(cur.fetchone()["attivo"]) is False
        cur.close()
    finally:
        conn.close()


def test_delete_utente_idempotent(client, seed_owner_test):
    """DELETE on already-deactivated -> 200 idempotent_noop=True."""
    owner_token, _ = seed_owner_test
    create_resp = client.post(
        "/api/utenti",
        headers={"X-User-Token": owner_token},
        json={"nome_visualizzato": "IdempotentTarget"},
    )
    target_id = create_resp.json()["id"]
    client.delete(f"/api/utenti/{target_id}", headers={"X-User-Token": owner_token})

    second = client.delete(
        f"/api/utenti/{target_id}",
        headers={"X-User-Token": owner_token},
    )
    assert second.status_code == 200
    assert second.json()["idempotent_noop"] is True


# ----- DELETE protezioni Q7 -----


def test_delete_utente_owner_blocked(client, seed_owner_test):
    """DELETE owner -> 409 CONSTRAINT_VIOLATION (Q7a)."""
    owner_token, owner_id = seed_owner_test
    resp = client.delete(
        f"/api/utenti/{owner_id}",
        headers={"X-User-Token": owner_token},
    )
    assert resp.status_code == 409
    body = resp.json()
    assert body["error"]["code"] == "CONSTRAINT_VIOLATION"
    assert "Owner" in body["error"]["message"]


def test_delete_utente_not_found(client, seed_owner_test):
    """DELETE non-existent id -> 404 NOT_FOUND."""
    owner_token, _ = seed_owner_test
    resp = client.delete(
        "/api/utenti/99999",
        headers={"X-User-Token": owner_token},
    )
    assert resp.status_code == 404
    body = resp.json()
    assert body["error"]["code"] == "NOT_FOUND"


def test_delete_utente_non_owner_forbidden(client, seed_owner_test, insert_test_user):
    """Paziente attempts DELETE -> 403 FORBIDDEN (before reaching Q7 checks)."""
    owner_token, _ = seed_owner_test
    paziente_token, _ = insert_test_user(nome="PazienteDel", ruolo="paziente")

    other_resp = client.post(
        "/api/utenti",
        headers={"X-User-Token": owner_token},
        json={"nome_visualizzato": "OtherTarget"},
    )
    other_id = other_resp.json()["id"]

    resp = client.delete(
        f"/api/utenti/{other_id}",
        headers={"X-User-Token": paziente_token},
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"
