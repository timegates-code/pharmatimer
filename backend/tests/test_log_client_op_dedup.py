"""
PharmaTimer OFFLINE-3 CS-2 (session 2/2) -- client_op_id first-gesture dedupe.
# OFFLINE-3 CS-2 idempotency_marker cs2-dedup (Spec v1.17 sez. 14.6, s.6.257)

Queen test + per-verb replay dedupe for the 5 log verbs.

Authored BEFORE the router patcher: the queen and the replay-dedupe cases MUST
FAIL until the server implements first-gesture dedupe. Their failure documents
the hole (M3 record falsification: a replayed /recupero subtracts INTERVAL
recupero_minuti twice because the endpoint is not idempotent today).

Measured idioms (Lesson #27): auth header X-User-Token; error body shape
r.json()["error"]["message"]; fixtures seed_owner_test / insert_test_farmaco /
client; ora_ricalcolata as ISO datetime string.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, time as dtime
from typing import Callable, Tuple

from fastapi.testclient import TestClient


def _new_targa() -> str:
    """Fresh UUID v4 client_op_id (CHAR(36))."""
    return str(uuid.uuid4())


def _auth(token: str) -> dict:
    return {"X-User-Token": token}


def _make_ricalcolata_dose(
    client: TestClient,
    token: str,
    owner_id: int,
    insert_test_farmaco: Callable[..., int],
) -> Tuple[int, date]:
    """Create interval drug, POST /presa dose 1 late (gap 60), nested ricalcolo
    dose 2 -> dose 2 in stato 'ricalcolata' (ora_ricalcolata 17:00, gap 60).

    The /presa carries NO targa (pre-v06 style): the dose-2 row starts with
    client_op_id NULL, so the /recupero targa is the first plate on that row.
    Returns (farmaco_id, today).
    """
    farmaco_id = insert_test_farmaco(
        utente_id=owner_id,
        nome="ReginaGap",
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
        "ora_effettiva": datetime.combine(today, dtime(9, 0)).isoformat(),
        "delta_minuti": 60,
        "gap_minuti": 60,
        "recupero_minuti": 0,
        "ricalcolo_dose_successiva": {
            "dose_numero": 2,
            "data": today.isoformat(),
            "ora_prevista": "16:00:00",
            "ora_ricalcolata": datetime.combine(today, dtime(17, 0)).isoformat(),
            "gap_minuti": 60,
        },
    }
    r = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json=presa_payload,
        headers=_auth(token),
    )
    assert r.status_code == 201
    return farmaco_id, today


# ---------------------------------------------------------------------------
# QUEEN: /recupero replay with the same targa must be a no-op (dedup), NOT a
# second subtraction. Today this FAILS: /recupero is not idempotent; the replay
# subtracts INTERVAL recupero_minuti a second time (M3 record falsification).
# ---------------------------------------------------------------------------
def test_regina_recupero_replay_same_targa_is_noop(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    token, owner_id = seed_owner_test
    farmaco_id, today = _make_ricalcolata_dose(
        client, token, owner_id, insert_test_farmaco
    )
    targa = _new_targa()
    body_recupero = {
        "data": today.isoformat(),
        "dose_numero": 2,
        "recupero_minuti": 30,
        "client_op_id": targa,
    }
    r1 = client.post(
        f"/api/farmaci/{farmaco_id}/log/recupero",
        json=body_recupero,
        headers=_auth(token),
    )
    assert r1.status_code == 200
    ora_after_first = r1.json()["ora_ricalcolata"]
    assert ora_after_first == datetime.combine(today, dtime(16, 30)).isoformat()

    # Replay the identical touch (same targa): the server must recognize it and
    # NOT re-apply -> row unchanged, dedup flag true.
    r2 = client.post(
        f"/api/farmaci/{farmaco_id}/log/recupero",
        json=body_recupero,
        headers=_auth(token),
    )
    assert r2.status_code == 200
    b2 = r2.json()
    assert b2.get("dedup") is True
    assert b2["ora_ricalcolata"] == ora_after_first  # no double subtraction
    assert b2["recupero_minuti"] == 30


def test_presa_replay_same_targa_dedup(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="PresaDedup")
    today = date.today()
    targa = _new_targa()
    payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "08:00:00",
        "ora_effettiva": datetime.combine(today, dtime(8, 5)).isoformat(),
        "delta_minuti": 5,
        "gap_minuti": 0,
        "recupero_minuti": 0,
        "client_op_id": targa,
    }
    r1 = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa", json=payload, headers=_auth(token)
    )
    assert r1.status_code == 201
    assert r1.json().get("dedup") in (False, None)  # first gesture, not a dedup

    r2 = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa", json=payload, headers=_auth(token)
    )
    assert r2.status_code == 200
    b2 = r2.json()
    assert b2.get("dedup") is True
    assert b2["stato"] == "presa"


def test_saltata_replay_same_targa_dedup(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="SaltDedup")
    today = date.today()
    payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "10:00:00",
        "client_op_id": _new_targa(),
    }
    r1 = client.post(
        f"/api/farmaci/{farmaco_id}/log/saltata", json=payload, headers=_auth(token)
    )
    assert r1.status_code == 201

    r2 = client.post(
        f"/api/farmaci/{farmaco_id}/log/saltata", json=payload, headers=_auth(token)
    )
    assert r2.status_code == 200
    b2 = r2.json()
    assert b2.get("dedup") is True
    assert b2["stato"] == "saltata"


def test_sospesa_replay_same_targa_dedup(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="SospDedup")
    today = date.today()
    payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "10:00:00",
        "client_op_id": _new_targa(),
    }
    r1 = client.post(
        f"/api/farmaci/{farmaco_id}/log/sospesa", json=payload, headers=_auth(token)
    )
    assert r1.status_code == 201

    r2 = client.post(
        f"/api/farmaci/{farmaco_id}/log/sospesa", json=payload, headers=_auth(token)
    )
    assert r2.status_code == 200
    b2 = r2.json()
    assert b2.get("dedup") is True
    assert b2["stato"] == "sospesa"


def test_undo_replay_same_targa_dedup(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="UndoDedup")
    today = date.today()
    # First create a 'saltata' row (no targa), then undo it WITH a targa.
    r_sal = client.post(
        f"/api/farmaci/{farmaco_id}/log/saltata",
        json={"data": today.isoformat(), "dose_numero": 1, "ora_prevista": "10:00:00"},
        headers=_auth(token),
    )
    assert r_sal.status_code == 201

    undo_payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "client_op_id": _new_targa(),
    }
    r1 = client.post(
        f"/api/farmaci/{farmaco_id}/log/undo", json=undo_payload, headers=_auth(token)
    )
    assert r1.status_code == 200
    assert r1.json()["stato"] == "prevista"

    r2 = client.post(
        f"/api/farmaci/{farmaco_id}/log/undo", json=undo_payload, headers=_auth(token)
    )
    assert r2.status_code == 200
    b2 = r2.json()
    assert b2.get("dedup") is True
    assert b2["stato"] == "prevista"


def test_presa_distinct_targa_still_conflicts(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Same slot, DIFFERENT targa = a genuine second touch on an already-taken
    dose -> stays 409 (M1 protection). Same targa = replay -> 200 dedup. This
    distinguishes an idempotent replay from a real double-take conflict.
    """
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="DistinctTarga")
    today = date.today()
    targa_a = _new_targa()
    base = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "08:00:00",
        "ora_effettiva": datetime.combine(today, dtime(8, 0)).isoformat(),
        "delta_minuti": 0,
        "gap_minuti": 0,
        "recupero_minuti": 0,
    }
    r1 = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json={**base, "client_op_id": targa_a},
        headers=_auth(token),
    )
    assert r1.status_code == 201

    # Different targa on an already-taken dose = real conflict, still 409.
    r_conflict = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json={**base, "client_op_id": _new_targa()},
        headers=_auth(token),
    )
    assert r_conflict.status_code == 409

    # Same targa = recognized replay, 200 dedup.
    r_replay = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json={**base, "client_op_id": targa_a},
        headers=_auth(token),
    )
    assert r_replay.status_code == 200
    assert r_replay.json().get("dedup") is True


def test_verbo_without_targa_backward_compatible(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """No client_op_id = pre-v06 behavior preserved (201, dedup false/absent)."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="NoTarga")
    today = date.today()
    r = client.post(
        f"/api/farmaci/{farmaco_id}/log/saltata",
        json={"data": today.isoformat(), "dose_numero": 1, "ora_prevista": "10:00:00"},
        headers=_auth(token),
    )
    assert r.status_code == 201
    assert r.json().get("dedup") in (False, None)
