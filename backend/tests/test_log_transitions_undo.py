"""
# F3-S3-beta CP1 idempotency_marker v01
PharmaTimer F3-S3-beta CP1
Pytest /undo transitions (4 test): presa fisso, presa intervallo + D+1 rollback,
saltata -> prevista, nothing_to_undo 409.
"""
from datetime import date, datetime, time as dtime
from typing import Callable, Tuple

from fastapi.testclient import TestClient


def test_post_undo_from_presa_fisso(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T1: /undo da 'presa' su farmaco 'fisso' -> 200 + stato 'prevista' + audit note."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="Lansox")
    today = date.today()
    presa_payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "08:00:00",
        "ora_effettiva": datetime.combine(today, dtime(8, 5)).isoformat(),
        "delta_minuti": 5,
        "gap_minuti": 0,
        "recupero_minuti": 0,
        "note": "Originale",
    }
    r_presa = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json=presa_payload,
        headers={"X-User-Token": token},
    )
    assert r_presa.status_code == 201
    undo_payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
    }
    r_undo = client.post(
        f"/api/farmaci/{farmaco_id}/log/undo",
        json=undo_payload,
        headers={"X-User-Token": token},
    )
    assert r_undo.status_code == 200
    body = r_undo.json()
    assert body["stato"] == "prevista"
    assert body["ora_effettiva"] is None
    assert body["delta_minuti"] is None
    assert body["recupero_minuti"] == 0
    assert body["note"] is not None
    assert "[undo " in body["note"]
    assert "Originale" in body["note"]


def test_post_undo_from_presa_intervallo_rolls_back_d_plus_one(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T2: /undo da 'presa' su farmaco 'intervallo' con D+1 ricalcolata -> rollback D+1."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(
        utente_id=owner_id,
        nome="ConInt",
        tipo_frequenza="intervallo",
        intervallo_ore="8.0",
        intervallo_minimo_ore="4.0",
        dosi_giornaliere=3,
    )
    today = date.today()
    presa_payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "08:00:00",
        "ora_effettiva": datetime.combine(today, dtime(8, 30)).isoformat(),
        "delta_minuti": 30,
        "gap_minuti": 30,
        "recupero_minuti": 0,
        "ricalcolo_dose_successiva": {
            "dose_numero": 2,
            "data": today.isoformat(),
            "ora_prevista": "16:00:00",
            "ora_ricalcolata": datetime.combine(today, dtime(16, 30)).isoformat(),
            "gap_minuti": 30,
        },
    }
    r_presa = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json=presa_payload,
        headers={"X-User-Token": token},
    )
    assert r_presa.status_code == 201
    # Verify D+1 'ricalcolata' present pre-undo
    get_r1 = client.get(
        f"/api/farmaci/{farmaco_id}/log",
        params={"data_from": today.isoformat(), "data_to": today.isoformat()},
        headers={"X-User-Token": token},
    )
    items_pre = get_r1.json()
    dose2_pre = next(i for i in items_pre if i["dose_numero"] == 2)
    assert dose2_pre["stato"] == "ricalcolata"

    r_undo = client.post(
        f"/api/farmaci/{farmaco_id}/log/undo",
        json={"data": today.isoformat(), "dose_numero": 1},
        headers={"X-User-Token": token},
    )
    assert r_undo.status_code == 200
    assert r_undo.json()["stato"] == "prevista"

    # Verify D+1 rolled back
    get_r2 = client.get(
        f"/api/farmaci/{farmaco_id}/log",
        params={"data_from": today.isoformat(), "data_to": today.isoformat()},
        headers={"X-User-Token": token},
    )
    items_post = get_r2.json()
    dose2_post = next(i for i in items_post if i["dose_numero"] == 2)
    assert dose2_post["stato"] == "prevista"
    assert dose2_post["ora_ricalcolata"] is None
    assert dose2_post["gap_minuti"] == 0


def test_post_undo_from_saltata(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T3: /undo da 'saltata' -> 200 + stato 'prevista' con audit note."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="Toradol")
    today = date.today()
    r_sal = client.post(
        f"/api/farmaci/{farmaco_id}/log/saltata",
        json={
            "data": today.isoformat(),
            "dose_numero": 1,
            "ora_prevista": "12:00:00",
            "note": "skip-orig",
        },
        headers={"X-User-Token": token},
    )
    assert r_sal.status_code == 201
    r_undo = client.post(
        f"/api/farmaci/{farmaco_id}/log/undo",
        json={"data": today.isoformat(), "dose_numero": 1},
        headers={"X-User-Token": token},
    )
    assert r_undo.status_code == 200
    body = r_undo.json()
    assert body["stato"] == "prevista"
    assert "[undo " in body["note"]


def test_post_undo_nothing_to_undo(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T4: /undo su stato 'prevista' -> 409 nothing_to_undo."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="Eutirox")
    today = date.today()
    # Insert prevista via /saltata then /undo, then /undo again -> 409
    r_sal = client.post(
        f"/api/farmaci/{farmaco_id}/log/saltata",
        json={
            "data": today.isoformat(),
            "dose_numero": 1,
            "ora_prevista": "07:00:00",
        },
        headers={"X-User-Token": token},
    )
    assert r_sal.status_code == 201
    r_undo1 = client.post(
        f"/api/farmaci/{farmaco_id}/log/undo",
        json={"data": today.isoformat(), "dose_numero": 1},
        headers={"X-User-Token": token},
    )
    assert r_undo1.status_code == 200
    assert r_undo1.json()["stato"] == "prevista"
    r_undo2 = client.post(
        f"/api/farmaci/{farmaco_id}/log/undo",
        json={"data": today.isoformat(), "dose_numero": 1},
        headers={"X-User-Token": token},
    )
    assert r_undo2.status_code == 409
    # SENTINEL_QPONTE_PIN_CONFLICT -- log_assunzioni.py :641, niente da annullare.
    assert r_undo2.json()["error"]["code"] == "CONFLICT"
