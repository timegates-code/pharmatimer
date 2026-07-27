"""
# F3-S3-beta CP1 idempotency_marker v01
PharmaTimer F3-S3-beta CP1
Pytest /sospesa transitions (4 test): INSERT, idempotent, source 'presa' refused,
lateral from 'saltata' refused.
"""
from datetime import date, datetime, time as dtime
from typing import Callable, Tuple

from fastapi.testclient import TestClient


def test_post_sospesa_insert_empty_slot(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T1: POST /sospesa su slot vuoto -> 201 + stato 'sospesa'."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="Brufen")
    today = date.today()
    payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "14:00:00",
        "note": "Dolore assente oggi",
    }
    response = client.post(
        f"/api/farmaci/{farmaco_id}/log/sospesa",
        json=payload,
        headers={"X-User-Token": token},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["stato"] == "sospesa"
    assert body["note"] == "Dolore assente oggi"


def test_post_sospesa_idempotent_block(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T2: POST /sospesa due volte sullo stesso slot -> seconda 409."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="Brufen2")
    today = date.today()
    payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "14:00:00",
    }
    r1 = client.post(
        f"/api/farmaci/{farmaco_id}/log/sospesa",
        json=payload,
        headers={"X-User-Token": token},
    )
    assert r1.status_code == 201
    r2 = client.post(
        f"/api/farmaci/{farmaco_id}/log/sospesa",
        json=payload,
        headers={"X-User-Token": token},
    )
    assert r2.status_code == 409
    # SENTINEL_QPONTE_PIN_CONFLICT -- log_assunzioni.py :521, dose gia sospesa.
    assert r2.json()["error"]["code"] == "CONFLICT"


def test_post_sospesa_source_presa_refused(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T3 (Sub-Q-NEW.2 = A): /sospesa rifiuta sorgente 'presa' -> 409."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="Eutirox")
    today = date.today()
    presa_payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "07:00:00",
        "ora_effettiva": datetime.combine(today, dtime(7, 0)).isoformat(),
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
    sospesa_payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "07:00:00",
    }
    r_sosp = client.post(
        f"/api/farmaci/{farmaco_id}/log/sospesa",
        json=sospesa_payload,
        headers={"X-User-Token": token},
    )
    assert r_sosp.status_code == 409
    # SENTINEL_QPONTE_PIN_CONFLICT -- log_assunzioni.py :526, conflitto di stato.
    assert r_sosp.json()["error"]["code"] == "CONFLICT"
    msg = r_sosp.json()["error"]["message"].lower()
    assert "presa" in msg or "non ammessa" in msg


def test_post_sospesa_lateral_from_saltata_refused(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T4 (Q-RES-3 = A): /sospesa da 'saltata' -> 409 (richiede /undo)."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="Toradol")
    today = date.today()
    saltata_payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "12:00:00",
    }
    r_sal = client.post(
        f"/api/farmaci/{farmaco_id}/log/saltata",
        json=saltata_payload,
        headers={"X-User-Token": token},
    )
    assert r_sal.status_code == 201
    r_sosp = client.post(
        f"/api/farmaci/{farmaco_id}/log/sospesa",
        json={
            "data": today.isoformat(),
            "dose_numero": 1,
            "ora_prevista": "12:00:00",
        },
        headers={"X-User-Token": token},
    )
    assert r_sosp.status_code == 409
    # SENTINEL_QPONTE_PIN_CONFLICT -- log_assunzioni.py :526, transizione da saltata.
    assert r_sosp.json()["error"]["code"] == "CONFLICT"
