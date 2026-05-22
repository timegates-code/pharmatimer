"""
PharmaTimer F3-S3alpha CP1
Pytest orari_base nested scoped utente+farmaco (4 test).

GET /api/farmaci/{id}/orari: T1 empty + T2 scoped cross-farmaco isolation.
PUT /api/farmaci/{id}/orari: T3 bulk replace happy + T4 scope violation 404.
"""
from typing import Callable, Tuple

import pytest
from fastapi.testclient import TestClient


def _orario(dose_numero: int = 1, **overrides) -> dict:
    """Build valid OrarioCreate item JSON payload."""
    base = {
        "dose_numero": dose_numero,
        "offset_minuti": 0,
        "ancora_riferimento": "colazione",
        "ora_prevista": "08:00:00",
        "descrizione_momento": "colazione",
    }
    base.update(overrides)
    return base


def test_get_orari_empty(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T1: GET orari per farmaco senza orari -> 200 + []."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="SenzaOrari")
    response = client.get(
        f"/api/farmaci/{farmaco_id}/orari",
        headers={"X-User-Token": token},
    )
    assert response.status_code == 200
    assert response.json() == []


def test_get_orari_scoped_cross_farmaco(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T2: PUT orari su farmaco A + GET su farmaco B -> [] (no leak cross-farmaco)."""
    token, owner_id = seed_owner_test
    farmaco_a = insert_test_farmaco(utente_id=owner_id, nome="FarmacoA")
    farmaco_b = insert_test_farmaco(utente_id=owner_id, nome="FarmacoB")
    put_response = client.put(
        f"/api/farmaci/{farmaco_a}/orari",
        json=[
            _orario(dose_numero=1),
            _orario(dose_numero=2, ora_prevista="20:00:00"),
        ],
        headers={"X-User-Token": token},
    )
    assert put_response.status_code == 200
    get_b = client.get(
        f"/api/farmaci/{farmaco_b}/orari",
        headers={"X-User-Token": token},
    )
    assert get_b.status_code == 200
    assert get_b.json() == []
    get_a = client.get(
        f"/api/farmaci/{farmaco_a}/orari",
        headers={"X-User-Token": token},
    )
    assert get_a.status_code == 200
    assert len(get_a.json()) == 2


def test_put_bulk_replace_happy(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T3: PUT 3 orari -> 200 + 3 items, poi PUT 1 orario -> only 1 (full replace)."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="TestPut")
    payload = [
        _orario(dose_numero=1, ora_prevista="08:00:00"),
        _orario(
            dose_numero=2, ora_prevista="14:00:00", ancora_riferimento="pranzo"
        ),
        _orario(
            dose_numero=3, ora_prevista="20:00:00", ancora_riferimento="cena"
        ),
    ]
    response = client.put(
        f"/api/farmaci/{farmaco_id}/orari",
        json=payload,
        headers={"X-User-Token": token},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 3
    assert [o["dose_numero"] for o in body] == [1, 2, 3]
    assert body[0]["ora_prevista"] == "08:00:00"
    assert body[2]["ancora_riferimento"] == "cena"

    replace_response = client.put(
        f"/api/farmaci/{farmaco_id}/orari",
        json=[_orario(dose_numero=1, ora_prevista="07:00:00")],
        headers={"X-User-Token": token},
    )
    assert replace_response.status_code == 200
    body2 = replace_response.json()
    assert len(body2) == 1
    assert body2[0]["ora_prevista"] == "07:00:00"


def test_put_orari_scope_violation_other_user(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_user: Callable[..., Tuple[str, int]],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T4: PUT orari su farmaco di altro utente -> 404 (security-by-obscurity)."""
    owner_token, _ = seed_owner_test
    _, other_user_id = insert_test_user(nome="Mario")
    farmaco_mario = insert_test_farmaco(utente_id=other_user_id, nome="MarioPills")
    response = client.put(
        f"/api/farmaci/{farmaco_mario}/orari",
        json=[_orario(dose_numero=1)],
        headers={"X-User-Token": owner_token},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"
