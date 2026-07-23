"""
# F3-S3-beta CP1 idempotency_marker v01
PharmaTimer F3-S3-beta CP1
Pytest /recupero transitions (11 test): happy, eccesso gap, stato non
ricalcolata, gap=0, semantica assoluta s.6.263, guardia ora_ricalcolata
NULL, reset a zero s.6.264.
Conteggio RIMISURATO sul file: la dicitura precedente dichiarava 4 ed era
stantia da piu sessioni.
"""
from datetime import date, datetime, time as dtime, timedelta
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
            "ora_ricalcolata": datetime.combine(today, dtime(16, gap_minutes) if gap_minutes < 60 else dtime(17, 0)).isoformat(),
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
            "ora_ricalcolata": datetime.combine(today, dtime(17, 0)).isoformat(),
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
    assert body["ora_ricalcolata"] == datetime.combine(today, dtime(16, 30)).isoformat()


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
            "ora_ricalcolata": datetime.combine(today, dtime(16, 0)).isoformat(),
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

def test_post_recupero_cross_midnight_no_false_anticipation(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Q-D (migration v04): dose 'ricalcolata' cross-midnight.

    ora_prevista 23:30 (giorno D), ora_ricalcolata 01:30 (giorno D+1), gap 120.
    /recupero 60 -> 200: nuova ora_ricalcolata 00:30 (D+1), che in confronto
    ASSOLUTO resta >= TIMESTAMP(data, 23:30). La vecchia logica time-of-day dava
    un falso 409 (01:30 < 23:30); il 200 prova R1 (INTERVAL cross-midnight) + R2
    (no-anticipation SQL-side full-datetime).

    Boundary: /recupero 121 -> 409. Nota: sotto l'invariante normale
    (ora_ricalcolata = pianificato + gap_minuti) questo 409 scatta sul gap-check
    (121 > gap 120), non sul post-check R2; R2 e' difesa in profondita'.
    """
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(
        utente_id=owner_id,
        nome="CrossMidnight",
        tipo_frequenza="intervallo",
        intervallo_ore="8.0",
        intervallo_minimo_ore="4.0",
        dosi_giornaliere=3,
    )
    today = date.today()
    planned = datetime.combine(today, dtime(23, 30))
    presa_payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "20:00:00",
        "ora_effettiva": datetime.combine(today, dtime(22, 0)).isoformat(),
        "delta_minuti": 120,
        "gap_minuti": 120,
        "recupero_minuti": 0,
        "ricalcolo_dose_successiva": {
            "dose_numero": 2,
            "data": today.isoformat(),
            "ora_prevista": "23:30:00",
            "ora_ricalcolata": (planned + timedelta(minutes=120)).isoformat(),
            "gap_minuti": 120,
        },
    }
    r_presa = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json=presa_payload,
        headers={"X-User-Token": token},
    )
    assert r_presa.status_code == 201

    r_ok = client.post(
        f"/api/farmaci/{farmaco_id}/log/recupero",
        json={
            "data": today.isoformat(),
            "dose_numero": 2,
            "recupero_minuti": 60,
        },
        headers={"X-User-Token": token},
    )
    assert r_ok.status_code == 200
    body = r_ok.json()
    assert body["stato"] == "ricalcolata"
    assert body["ora_ricalcolata"] == (planned + timedelta(minutes=60)).isoformat()

    r_over = client.post(
        f"/api/farmaci/{farmaco_id}/log/recupero",
        json={
            "data": today.isoformat(),
            "dose_numero": 2,
            "recupero_minuti": 121,
        },
        headers={"X-User-Token": token},
    )
    assert r_over.status_code == 409


# --- SENTINEL_S2C2A_RECUPERO_ABSOLUTE_TESTS ---------------------------------
# s.6.263: POST /recupero carries an ABSOLUTE total, not a relative decrement.
# Shared baseline for the cases below (Spec 4.5 worked example):
#   dose 2 -> ora_prevista 16:00, ora_ricalcolata 18:00, gap_minuti 120.


def _setup_gap120(
    client: TestClient,
    token: str,
    owner_id: int,
    insert_test_farmaco: Callable[..., int],
    nome: str,
) -> Tuple[int, date, datetime]:
    """Interval drug, dose 1 taken 2h late, dose 2 left 'ricalcolata'.

    Returns (farmaco_id, today, base_ricalcolata), where base_ricalcolata is
    ora_ricalcolata BEFORE any recupero is applied: today at 18:00.

    Deliberately not reusing _setup_interval_drug_with_gap: that helper pins
    ora_ricalcolata to 17:00 for every gap >= 60, which does not agree with
    gap_minuti=120.
    """
    farmaco_id = insert_test_farmaco(
        utente_id=owner_id,
        nome=nome,
        tipo_frequenza="intervallo",
        intervallo_ore="8.0",
        intervallo_minimo_ore="4.0",
        dosi_giornaliere=3,
    )
    today = date.today()
    base_ricalcolata = datetime.combine(today, dtime(18, 0))
    presa_payload = {
        "data": today.isoformat(),
        "dose_numero": 1,
        "ora_prevista": "08:00:00",
        "ora_effettiva": datetime.combine(today, dtime(10, 0)).isoformat(),
        "delta_minuti": 120,
        "gap_minuti": 120,
        "recupero_minuti": 0,
        "ricalcolo_dose_successiva": {
            "dose_numero": 2,
            "data": today.isoformat(),
            "ora_prevista": "16:00:00",
            "ora_ricalcolata": base_ricalcolata.isoformat(),
            "gap_minuti": 120,
        },
    }
    r = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json=presa_payload,
        headers={"X-User-Token": token},
    )
    assert r.status_code == 201
    return farmaco_id, today, base_ricalcolata


def _post_recupero(
    client: TestClient,
    token: str,
    farmaco_id: int,
    today: date,
    minuti: int,
):
    """POST /recupero on dose 2 of the shared baseline."""
    return client.post(
        f"/api/farmaci/{farmaco_id}/log/recupero",
        json={
            "data": today.isoformat(),
            "dose_numero": 2,
            "recupero_minuti": minuti,
        },
        headers={"X-User-Token": token},
    )


def test_post_recupero_repeated_is_absolute(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T6 (s.6.263): the same total posted twice is inert, not cumulative.

    M3 -- the record must state the truth. Under the relative form the second
    POST shifts ora_ricalcolata again while recupero_minuti stays at 30, so the
    column understates the real shift by half.
    """
    token, owner_id = seed_owner_test
    farmaco_id, today, base = _setup_gap120(
        client, token, owner_id, insert_test_farmaco, "RepeatAbs"
    )

    r1 = _post_recupero(client, token, farmaco_id, today, 30)
    assert r1.status_code == 200
    assert r1.json()["ora_ricalcolata"] == (
        base - timedelta(minutes=30)
    ).isoformat()

    r2 = _post_recupero(client, token, farmaco_id, today, 30)
    assert r2.status_code == 200
    body = r2.json()
    assert body["recupero_minuti"] == 30
    assert body["ora_ricalcolata"] == (base - timedelta(minutes=30)).isoformat()
    # Same assertion restated as the M3 invariant rather than a literal time.
    assert body["ora_ricalcolata"] == (
        base - timedelta(minutes=body["recupero_minuti"])
    ).isoformat()


def test_post_recupero_increase_reanchors(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T7 (s.6.263): raising the total re-anchors to the original time.

    30 then 90 must land at base-90, not at base-30-90.
    """
    token, owner_id = seed_owner_test
    farmaco_id, today, base = _setup_gap120(
        client, token, owner_id, insert_test_farmaco, "IncreaseAbs"
    )

    assert _post_recupero(client, token, farmaco_id, today, 30).status_code == 200

    r2 = _post_recupero(client, token, farmaco_id, today, 90)
    assert r2.status_code == 200
    body = r2.json()
    assert body["recupero_minuti"] == 90
    assert body["ora_ricalcolata"] == (base - timedelta(minutes=90)).isoformat()


def test_post_recupero_decrease_moves_dose_later(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T8 (s.6.263): lowering the total moves the dose later.

    Not expressible under the relative form, where every POST can only
    subtract. Lets the user correct a recupero set too aggressively.
    """
    token, owner_id = seed_owner_test
    farmaco_id, today, base = _setup_gap120(
        client, token, owner_id, insert_test_farmaco, "DecreaseAbs"
    )

    assert _post_recupero(client, token, farmaco_id, today, 90).status_code == 200

    r2 = _post_recupero(client, token, farmaco_id, today, 30)
    assert r2.status_code == 200
    body = r2.json()
    assert body["recupero_minuti"] == 30
    assert body["ora_ricalcolata"] == (base - timedelta(minutes=30)).isoformat()


def test_post_recupero_cumulative_stays_within_gap(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T9 (s.6.263): with an absolute total the gap check regains its meaning.

    90 posted twice is a total of 90, inside gap 120, so it must succeed. Under
    the relative form the second POST subtracts again and the anticipation
    post-check answers 409 for a request the clinical model allows.

    The trailing 121 pins that the gap check still fires under the new
    semantics: it must stay a 409.
    """
    token, owner_id = seed_owner_test
    farmaco_id, today, base = _setup_gap120(
        client, token, owner_id, insert_test_farmaco, "CumulativeAbs"
    )

    assert _post_recupero(client, token, farmaco_id, today, 90).status_code == 200

    r2 = _post_recupero(client, token, farmaco_id, today, 90)
    assert r2.status_code == 200
    assert r2.json()["ora_ricalcolata"] == (
        base - timedelta(minutes=90)
    ).isoformat()

    r3 = _post_recupero(client, token, farmaco_id, today, 121)
    assert r3.status_code == 409


def test_post_recupero_reset_to_zero_restores_original(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T11 (s.6.264): recupero_minuti=0 is a legitimate gesture -- RESET.

    SENTINEL_S6264_RESET_PIN

    Under the ABSOLUTE semantics of s.6.263 the domain of the total is
    0..gap, and zero means: put ora_ricalcolata back to the time it was
    originally recalculated to. Before s.6.264 that point was unreachable
    on BOTH sides (server gt=0 -> 422, client guard by value), so a true
    total of zero could only be approximated with a one-minute workaround
    that falsifies the record by one minute (M3).

    Replay is inert: a second identical reset rewrites the same absolute
    total. That is the property s.6.263 bought, and the precondition of
    the retrying FIFO queue of CS-4 (M2). Targa-based dedupe of this same
    route is pinned separately in test_log_client_op_dedup.py.

    M1 unaffected: the reset moves the dose only TOWARDS its original
    recalculated time, never before ora_prevista -- the SQL anticipation
    post-check is untouched.
    """
    token, owner_id = seed_owner_test
    farmaco_id, today, base = _setup_gap120(
        client, token, owner_id, insert_test_farmaco, "ResetZero"
    )

    r1 = _post_recupero(client, token, farmaco_id, today, 90)
    assert r1.status_code == 200
    assert r1.json()["ora_ricalcolata"] == (
        base - timedelta(minutes=90)
    ).isoformat()

    r2 = _post_recupero(client, token, farmaco_id, today, 0)
    assert r2.status_code == 200
    body = r2.json()
    assert body["stato"] == "ricalcolata"
    assert body["recupero_minuti"] == 0
    assert body["ora_ricalcolata"] == base.isoformat()

    r3 = _post_recupero(client, token, farmaco_id, today, 0)
    assert r3.status_code == 200
    assert r3.json()["recupero_minuti"] == 0
    assert r3.json()["ora_ricalcolata"] == base.isoformat()


def test_post_recupero_null_ora_ricalcolata_rejected(
    client: TestClient,
    seed_owner_test: Tuple[str, int],
    insert_test_farmaco: Callable[..., int],
    db_test_pool,
) -> None:
    """T10: stato 'ricalcolata' with ora_ricalcolata NULL must be refused.

    The column is NULLABLE (measured on the dev schema). With no explicit
    guard, the anticipation post-check compares against NULL, NULL is falsy,
    and the row is stored with recupero_minuti > 0 and no time at all: M3.
    """
    token, owner_id = seed_owner_test
    farmaco_id, today, _base = _setup_gap120(
        client, token, owner_id, insert_test_farmaco, "NullRicalc"
    )

    conn = db_test_pool.get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE log_assunzioni SET ora_ricalcolata = NULL "
            "WHERE utente_id = %s AND farmaco_id = %s "
            "AND data = %s AND dose_numero = %s",
            (owner_id, farmaco_id, today, 2),
        )
        assert cur.rowcount == 1
        conn.commit()
        cur.close()
    finally:
        conn.close()

    r = _post_recupero(client, token, farmaco_id, today, 30)
    assert r.status_code == 409
