"""
PharmaTimer F3-S3alpha CP1
Pytest orari_base nested scoped utente+farmaco (4 test).

GET /api/farmaci/{id}/orari: T1 empty + T2 scoped cross-farmaco isolation.
PUT /api/farmaci/{id}/orari: T3 bulk replace happy + T4 scope violation 404.
"""
from collections.abc import Callable
from datetime import date, timedelta

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
    seed_owner_test: tuple[str, int],
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
    seed_owner_test: tuple[str, int],
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
    seed_owner_test: tuple[str, int],
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
    seed_owner_test: tuple[str, int],
    insert_test_user: Callable[..., tuple[str, int]],
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


def _orario_assoluto(dose_numero: int, data_specifica: str, **overrides) -> dict:
    """Build a fisso_date orario item (ancora 'assoluto' + data_specifica)."""
    return _orario(
        dose_numero=dose_numero,
        ancora_riferimento="assoluto",
        data_specifica=data_specifica,
        **overrides,
    )


def test_put_orari_fisso_date_roundtrip(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T5: PUT fisso_date 2 date x 2 dosi (assoluto) -> round-trip + ORDER BY data,dose."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="FissoDate")
    payload = [
        _orario_assoluto(1, "2026-07-02", ora_prevista="08:00:00"),
        _orario_assoluto(2, "2026-07-02", ora_prevista="20:00:00"),
        _orario_assoluto(1, "2026-07-01", ora_prevista="08:00:00"),
        _orario_assoluto(2, "2026-07-01", ora_prevista="20:00:00"),
    ]
    response = client.put(
        f"/api/farmaci/{farmaco_id}/orari",
        json=payload,
        headers={"X-User-Token": token},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 4
    assert [(o["data_specifica"], o["dose_numero"]) for o in body] == [
        ("2026-07-01", 1),
        ("2026-07-01", 2),
        ("2026-07-02", 1),
        ("2026-07-02", 2),
    ]
    assert all(o["ancora_riferimento"] == "assoluto" for o in body)


def test_put_orari_fisso_date_mixed_422(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T6: payload misto (valorizzata + NULL) -> 422 (farmaco mono-tipo, Q-F)."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="Misto")
    payload = [
        _orario_assoluto(1, "2026-07-01"),
        _orario(dose_numero=2),
    ]
    response = client.put(
        f"/api/farmaci/{farmaco_id}/orari",
        json=payload,
        headers={"X-User-Token": token},
    )
    assert response.status_code == 422


def test_put_orari_fisso_date_anchor_not_assoluto_422(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T7: riga con data_specifica e ancora != 'assoluto' -> 422 (Q-H)."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="AncoraKo")
    payload = [_orario(dose_numero=1, data_specifica="2026-07-01")]
    response = client.put(
        f"/api/farmaci/{farmaco_id}/orari",
        json=payload,
        headers={"X-User-Token": token},
    )
    assert response.status_code == 422


def test_put_orari_fisso_date_over_30_dates_422(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T8: > 30 date distinte -> 422 (Q-G)."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="Over30")
    start = date(2026, 7, 1)
    payload = [
        _orario_assoluto(1, (start + timedelta(days=i)).isoformat())
        for i in range(31)
    ]
    response = client.put(
        f"/api/farmaci/{farmaco_id}/orari",
        json=payload,
        headers={"X-User-Token": token},
    )
    assert response.status_code == 422


def test_put_orari_fisso_date_broken_sequence_422(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T9: sequenza dose_numero per-data con gap (1,3) -> 422."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="SeqRotta")
    payload = [
        _orario_assoluto(1, "2026-07-01"),
        _orario_assoluto(3, "2026-07-01"),
    ]
    response = client.put(
        f"/api/farmaci/{farmaco_id}/orari",
        json=payload,
        headers={"X-User-Token": token},
    )
    assert response.status_code == 422


def test_put_orari_recurring_null_regression(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T10: regressione righe ricorrenti (data_specifica NULL) -> 200 + campo None."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="Ricorrente")
    payload = [
        _orario(dose_numero=1),
        _orario(dose_numero=2, ora_prevista="20:00:00"),
    ]
    response = client.put(
        f"/api/farmaci/{farmaco_id}/orari",
        json=payload,
        headers={"X-User-Token": token},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert all(o["data_specifica"] is None for o in body)


def test_put_orari_fisso_date_variable_kd_roundtrip(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T11: k_D variabile per data (1 dose il 07-01, 2 dosi il 07-02) -> 200 (Spec v1.16).

    Pre-rilassamento questo payload dava 422 (Pattern S, M costante). Lista piatta: 200.
    """
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="VarKd")
    payload = [
        _orario_assoluto(1, "2026-07-01", ora_prevista="08:00:00"),
        _orario_assoluto(1, "2026-07-02", ora_prevista="08:00:00"),
        _orario_assoluto(2, "2026-07-02", ora_prevista="20:00:00"),
    ]
    response = client.put(
        f"/api/farmaci/{farmaco_id}/orari",
        json=payload,
        headers={"X-User-Token": token},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 3
    assert [(o["data_specifica"], o["dose_numero"]) for o in body] == [
        ("2026-07-01", 1),
        ("2026-07-02", 1),
        ("2026-07-02", 2),
    ]


def test_put_orari_fisso_date_variable_kd_broken_seq_422(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T12: k_D variabile ma sequenza per-data con gap (07-02: 1,3) -> 422.

    Prova che la sequenzialita per-data resta applicata anche fuori da Pattern S.
    """
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="VarKdGap")
    payload = [
        _orario_assoluto(1, "2026-07-01"),
        _orario_assoluto(1, "2026-07-02"),
        _orario_assoluto(3, "2026-07-02"),
    ]
    response = client.put(
        f"/api/farmaci/{farmaco_id}/orari",
        json=payload,
        headers={"X-User-Token": token},
    )
    assert response.status_code == 422
