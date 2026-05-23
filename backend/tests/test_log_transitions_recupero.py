"""
# F3-S3-beta CP1 idempotency_marker v01
PharmaTimer F3-S3-beta CP1
Pytest /recupero transitions (4 test): happy, eccesso gap, stato non ricalcolata,
gap=0.
"""
from datetime import date, datetime, time as dtime
from typing import Callable, Tuple

from fastapi.testclient import TestClient


def _setup_interval_drug_with_gap(
    client: TestClient,
    token: str,
    owner_id: int,
    insert_test_farmaco: Callable[..., int],
    gap_minutes: int,
) -> Tuple[int, date]:
    """Helper: create interval drug, POST /presa dose 1 late by `gap_minutes`,
    nested ricalcolo dose 2 -> D+1 'ricalcolata' with gap_minuti.
    Returns (farmaco_id, today).
    """
    farmaco_id = insert_test_farmaco(
        utente_id=owner_id,
        nome="GapDrug",
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
        "ora_effettiva": datetime.combine(today, dtime(8, gap_minutes if gap_minutes < 60 else 0)).isoformat(),
        "delta_minuti": gap_minutes,
        "gap_minuti": gap_minutes,
        "recupero_minuti": 0,
        "ricalcolo_dose_successiva": {
            "dose_numero": 2,
            "data": today.isoformat(),
            "ora_prevista": "16:00:00",
            "ora_ricalcolata": f"16:{gap_minutes:02d}:00" if gap_minutes < 60 else "17:00:00",
            "gap_minuti": gap_minutes,
        },
    }
    r = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json=presa_payload,
        headers={"X-User-Token": token},
    )
    assert r.status_code == 201
    return farmaco_id, today


def test_post_recupero_happy(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T1: /recupero 30min su ricalcolata gap=60 -> 200 + nuova ora_ricalcolata."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(
        utente_id=owner_id,
        nome="HappyGap",
        tipo_frequenza="intervallo",
        intervallo_ore="8.0",
        intervallo_minimo_ore="4.0",
        dosi_giornaliere=3,
    )
    today = date.today()
    # Setup gap=60: dose 1 presa at 09:00 (ora_prevista 08:00 -> delta 60),
    # nested D+1 ricalcolata 17:00 (ora_prevista 16:00, gap_minuti 60).
    presa_payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "08:00:00",
        "ora_effettiva": datetime.combine(today, dtime(9, 0)).isoformat(),
        "delta_minuti": 60,
        "gap_minuti": 60,
        "recupero_minuti": 0,
        "ricalcolo_dose_successiva": {
            "dose_numero": 2,
            "data": today.isoformat(),
            "ora_prevista": "16:00:00",
            "ora_ricalcolata": "17:00:00",
            "gap_minuti": 60,
        },
    }
    r_presa = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json=presa_payload,
        headers={"X-User-Token": token},
    )
    assert r_presa.status_code == 201
    r_rec = client.post(
        f"/api/farmaci/{farmaco_id}/log/recupero",
        json={
            "data": today.isoformat(),
            "dose_numero": 2,
            "recupero_minuti": 30,
        },
        headers={"X-User-Token": token},
    )
    assert r_rec.status_code == 200
    body = r_rec.json()
    assert body["stato"] == "ricalcolata"
    assert body["recupero_minuti"] == 30
    assert body["ora_ricalcolata"] == "16:30:00"


def test_post_recupero_exceeds_gap(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T2: /recupero > gap_minuti -> 409 (eccesso)."""
    token, owner_id = seed_owner_test
    farmaco_id, today = _setup_interval_drug_with_gap(
        client, token, owner_id, insert_test_farmaco, gap_minutes=30
    )
    r = client.post(
        f"/api/farmaci/{farmaco_id}/log/recupero",
        json={
            "data": today.isoformat(),
            "dose_numero": 2,
            "recupero_minuti": 999,
        },
        headers={"X-User-Token": token},
    )
    assert r.status_code == 409
    msg = r.json()["error"]["message"].lower()
    assert "eccede" in msg or "gap" in msg


def test_post_recupero_invalid_state(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T3: /recupero su stato != 'ricalcolata' -> 409."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="NonRicalc")
    today = date.today()
    # Create a 'saltata' row, then attempt /recupero.
    r_sal = client.post(
        f"/api/farmaci/{farmaco_id}/log/saltata",
        json={
            "data": today.isoformat(),
            "dose_numero": 1,
            "ora_prevista": "10:00:00",
        },
        headers={"X-User-Token": token},
    )
    assert r_sal.status_code == 201
    r_rec = client.post(
        f"/api/farmaci/{farmaco_id}/log/recupero",
        json={
            "data": today.isoformat(),
            "dose_numero": 1,
            "recupero_minuti": 10,
        },
        headers={"X-User-Token": token},
    )
    assert r_rec.status_code == 409


def test_post_recupero_no_gap(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T4: /recupero su dose 'ricalcolata' ma gap_minuti=0 -> 409 no_gap.

    Construct a ricalcolata row with gap=0 via direct /presa nested with
    zero-gap ricalcolo_dose_successiva on an interval drug.
    """
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(
        utente_id=owner_id,
        nome="ZeroGap",
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
        "ora_effettiva": datetime.combine(today, dtime(8, 0)).isoformat(),
        "delta_minuti": 0,
        "gap_minuti": 0,
        "recupero_minuti": 0,
        "ricalcolo_dose_successiva": {
            "dose_numero": 2,
            "data": today.isoformat(),
            "ora_prevista": "16:00:00",
            "ora_ricalcolata": "16:00:00",
            "gap_minuti": 0,
        },
    }
    r_presa = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json=presa_payload,
        headers={"X-User-Token": token},
    )
    assert r_presa.status_code == 201
    r_rec = client.post(
        f"/api/farmaci/{farmaco_id}/log/recupero",
        json={
            "data": today.isoformat(),
            "dose_numero": 2,
            "recupero_minuti": 5,
        },
        headers={"X-User-Token": token},
    )
    assert r_rec.status_code == 409
    msg = r_rec.json()["error"]["message"].lower()
    assert "gap" in msg or "recuperare" in msg
