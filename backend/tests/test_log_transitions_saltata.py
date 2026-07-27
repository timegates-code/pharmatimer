"""
# F3-S3-beta CP1 idempotency_marker v01
PharmaTimer F3-S3-beta CP1
Pytest /saltata transitions (4 test): INSERT, UPDATE, idempotent, scope.
"""
from datetime import date, datetime, time as dtime
from typing import Callable, Tuple

from fastapi.testclient import TestClient


def test_post_saltata_insert_empty_slot(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T1: POST /saltata su slot vuoto -> 201 + stato 'saltata' nuovo."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="Insulin")
    today = date.today()
    payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "08:00:00",
        "note": "Sintomi peggio",
    }
    response = client.post(
        f"/api/farmaci/{farmaco_id}/log/saltata",
        json=payload,
        headers={"X-User-Token": token},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["stato"] == "saltata"
    assert body["dose_numero"] == 1
    assert body["note"] == "Sintomi peggio"


def test_post_saltata_update_from_presa_blocked(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T2: /saltata su slot in stato 'presa' -> 409 (richiede /undo)."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="Lansox")
    today = date.today()
    presa_payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "08:00:00",
        "ora_effettiva": datetime.combine(today, dtime(8, 0)).isoformat(),
        "delta_minuti": 0,
        "gap_minuti": 0,
        "recupero_minuti": 0,
    }
    r_presa = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json=presa_payload,
        headers={"X-User-Token": token},
    )
    assert r_presa.status_code == 201
    saltata_payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "08:00:00",
    }
    r_saltata = client.post(
        f"/api/farmaci/{farmaco_id}/log/saltata",
        json=saltata_payload,
        headers={"X-User-Token": token},
    )
    assert r_saltata.status_code == 409
    # SENTINEL_QPONTE_PIN_CONFLICT -- log_assunzioni.py :414, transizione da presa.
    assert r_saltata.json()["error"]["code"] == "CONFLICT"


def test_post_saltata_idempotent_block(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T3: POST /saltata due volte sullo stesso slot -> seconda 409."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="Cardura")
    today = date.today()
    payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "20:00:00",
    }
    r1 = client.post(
        f"/api/farmaci/{farmaco_id}/log/saltata",
        json=payload,
        headers={"X-User-Token": token},
    )
    assert r1.status_code == 201
    r2 = client.post(
        f"/api/farmaci/{farmaco_id}/log/saltata",
        json=payload,
        headers={"X-User-Token": token},
    )
    assert r2.status_code == 409
    # SENTINEL_QPONTE_PIN_CONFLICT -- log_assunzioni.py :409, dose gia saltata.
    # La disgiunzione precedente era VACUA: il primo membro e il messaggio, che
    # la migrazione non tocca, quindi il secondo non discriminava mai. Spezzata
    # in due asserti duri: ora il codice deve essere quello giusto.
    assert "gia in stato" in r2.json()["error"]["message"].lower()
    assert r2.json()["error"]["code"] == "CONFLICT"


def test_post_saltata_scope_violation(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_user: Callable[..., Tuple[str, int]],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T4: /saltata su farmaco di altro utente con TOKEN owner -> 404."""
    owner_token, _ = seed_owner_test
    _, other_id = insert_test_user(nome="Anna")
    farmaco_anna = insert_test_farmaco(utente_id=other_id, nome="AnnaPills")
    today = date.today()
    payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "08:00:00",
    }
    response = client.post(
        f"/api/farmaci/{farmaco_anna}/log/saltata",
        json=payload,
        headers={"X-User-Token": owner_token},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"
