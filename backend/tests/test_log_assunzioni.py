"""
PharmaTimer F3-S3alpha CP1
Pytest READ + POST presa log_assunzioni scoped utente+farmaco (4 test).

GET /api/farmaci/{id}/log: T1 empty + T2 scoped cross-farmaco isolation.
POST /api/farmaci/{id}/log/presa: T3 happy + nested ricalcolo + T4 scope 404.
"""
from collections.abc import Callable
from datetime import date, datetime
from datetime import time as dtime

from fastapi.testclient import TestClient


def test_get_log_empty(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T1: GET log per farmaco senza eventi -> 200 + []."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="NoLog")
    today = date.today().isoformat()
    response = client.get(
        f"/api/farmaci/{farmaco_id}/log",
        params={"data_from": today, "data_to": today},
        headers={"X-User-Token": token},
    )
    assert response.status_code == 200
    assert response.json() == []


def test_get_log_scoped_cross_farmaco(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T2: POST presa su farmaco A + GET log su farmaco B -> [] (no leak)."""
    token, owner_id = seed_owner_test
    farmaco_a = insert_test_farmaco(utente_id=owner_id, nome="FarmacoA")
    farmaco_b = insert_test_farmaco(utente_id=owner_id, nome="FarmacoB")
    today = date.today()
    presa_payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "08:00:00",
        "ora_effettiva": datetime.combine(today, dtime(8, 5)).isoformat(),
        "delta_minuti": 5,
        "gap_minuti": 0,
        "recupero_minuti": 0,
        "note": None,
    }
    post_response = client.post(
        f"/api/farmaci/{farmaco_a}/log/presa",
        json=presa_payload,
        headers={"X-User-Token": token},
    )
    assert post_response.status_code == 201
    get_b = client.get(
        f"/api/farmaci/{farmaco_b}/log",
        params={"data_from": today.isoformat(), "data_to": today.isoformat()},
        headers={"X-User-Token": token},
    )
    assert get_b.status_code == 200
    assert get_b.json() == []
    get_a = client.get(
        f"/api/farmaci/{farmaco_a}/log",
        params={"data_from": today.isoformat(), "data_to": today.isoformat()},
        headers={"X-User-Token": token},
    )
    assert len(get_a.json()) == 1
    assert get_a.json()[0]["stato"] == "presa"


def test_post_presa_with_ricalcolo(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T3: POST presa con ricalcolo_dose_successiva -> 201 + dose D+1 ricalcolata."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(
        utente_id=owner_id,
        nome="ConRicalcolo",
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
        "note": "Test ritardo",
        "ricalcolo_dose_successiva": {
            "dose_numero": 2,
            "data": today.isoformat(),
            "ora_prevista": "16:00:00",
            "ora_ricalcolata": datetime.combine(today, dtime(16, 30)).isoformat(),
            "gap_minuti": 30,
        },
    }
    response = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json=presa_payload,
        headers={"X-User-Token": token},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["stato"] == "presa"
    assert body["dose_numero"] == 1
    assert body["delta_minuti"] == 30

    get_response = client.get(
        f"/api/farmaci/{farmaco_id}/log",
        params={"data_from": today.isoformat(), "data_to": today.isoformat()},
        headers={"X-User-Token": token},
    )
    assert get_response.status_code == 200
    items = get_response.json()
    assert len(items) == 2
    dose2 = next(i for i in items if i["dose_numero"] == 2)
    assert dose2["stato"] == "ricalcolata"
    assert dose2["ora_ricalcolata"] == datetime.combine(today, dtime(16, 30)).isoformat()
    assert dose2["gap_minuti"] == 30


def test_post_presa_scope_violation(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_user: Callable[..., tuple[str, int]],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T4: POST presa su farmaco di altro utente -> 404 (security-by-obscurity)."""
    owner_token, _ = seed_owner_test
    _, other_user_id = insert_test_user(nome="Mario")
    farmaco_mario = insert_test_farmaco(utente_id=other_user_id, nome="MarioPills")
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
    response = client.post(
        f"/api/farmaci/{farmaco_mario}/log/presa",
        json=presa_payload,
        headers={"X-User-Token": owner_token},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"
