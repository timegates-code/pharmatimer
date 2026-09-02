"""
PharmaTimer F3-S2 CP1
Pytest CRUD farmaci scoped utente_id (12 test, par.11.D-S2 pre-code validation).

POST /api/farmaci (5 test): happy fisso/intervallo + 2 cross-field FAIL + data range FAIL.
PUT /api/farmaci/{id} (3 test): happy + NOT_FOUND + scope violation.
DELETE /api/farmaci/{id} (4 test): happy SOFT + already-inactive + NOT_FOUND + GET-post.

Covers RepositoryError vocabulary (code/severity/message body shape par.22.34-Fase2).
"""
from collections.abc import Callable
from datetime import date, timedelta

from fastapi.testclient import TestClient


def _payload_fisso(**overrides) -> dict:
    """Build valid POST payload for tipo_frequenza='fisso'."""
    base = {
        "nome": "TestFisso",
        "principio_attivo": "test_pa",
        "funzione": "Test fisso",
        "tipo_frequenza": "fisso",
        "intervallo_ore": None,
        "intervallo_minimo_ore": None,
        "dosi_giornaliere": 1,
        "relazione_pasto": "indifferente",
        "dettaglio_pasto": None,
        "note": None,
        "data_inizio": date.today().isoformat(),
        "data_fine": None,
        "attivo": True,
        "demo": False,
    }
    base.update(overrides)
    return base


def _payload_intervallo(**overrides) -> dict:
    """Build valid POST payload for tipo_frequenza='intervallo'."""
    base = _payload_fisso()
    base.update(
        {
            "nome": "TestIntervallo",
            "tipo_frequenza": "intervallo",
            "intervallo_ore": "8.0",
            "intervallo_minimo_ore": "4.0",
            "dosi_giornaliere": 3,
        }
    )
    base.update(overrides)
    return base


def test_post_happy_fisso(
    client: TestClient, seed_owner_test: tuple[str, int]
) -> None:
    """T1: POST happy fisso -> 201 + Location header + body con id/created_at."""
    token, _ = seed_owner_test
    payload = _payload_fisso()
    response = client.post(
        "/api/farmaci", json=payload, headers={"X-User-Token": token}
    )
    assert response.status_code == 201
    assert "Location" in response.headers
    assert response.headers["Location"].startswith("/api/farmaci/")
    body = response.json()
    assert body["nome"] == "TestFisso"
    assert body["tipo_frequenza"] == "fisso"
    assert body["intervallo_ore"] is None
    assert body["dosi_giornaliere"] == 1
    assert body["attivo"] is True
    assert "id" in body
    assert "created_at" in body
    assert "updated_at" in body


def test_post_happy_intervallo(
    client: TestClient, seed_owner_test: tuple[str, int]
) -> None:
    """T2: POST happy intervallo -> 201 + Location + Decimal serializzato come stringa."""
    token, _ = seed_owner_test
    payload = _payload_intervallo()
    response = client.post(
        "/api/farmaci", json=payload, headers={"X-User-Token": token}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["tipo_frequenza"] == "intervallo"
    assert body["intervallo_ore"] == "8.0"
    assert body["intervallo_minimo_ore"] == "4.0"
    assert body["dosi_giornaliere"] == 3


def test_post_fail_fisso_with_intervallo_ore(
    client: TestClient, seed_owner_test: tuple[str, int]
) -> None:
    """T3: POST fisso + intervallo_ore valorizzato -> 422 (cross-field validator)."""
    token, _ = seed_owner_test
    payload = _payload_fisso(intervallo_ore="8.0")
    response = client.post(
        "/api/farmaci", json=payload, headers={"X-User-Token": token}
    )
    assert response.status_code == 422
    assert "intervallo_ore deve essere NULL per tipo_frequenza=fisso" in str(
        response.json()
    )


def test_post_fail_intervallo_without_intervallo_ore(
    client: TestClient, seed_owner_test: tuple[str, int]
) -> None:
    """T4: POST intervallo + intervallo_ore NULL -> 422 (cross-field validator)."""
    token, _ = seed_owner_test
    payload = _payload_intervallo(intervallo_ore=None, intervallo_minimo_ore=None)
    response = client.post(
        "/api/farmaci", json=payload, headers={"X-User-Token": token}
    )
    assert response.status_code == 422
    assert "intervallo_ore obbligatorio" in str(response.json())


def test_post_fail_data_fine_before_data_inizio(
    client: TestClient, seed_owner_test: tuple[str, int]
) -> None:
    """T5: POST data_fine < data_inizio -> 422 (date range validator)."""
    token, _ = seed_owner_test
    today = date.today()
    payload = _payload_fisso(
        data_inizio=today.isoformat(),
        data_fine=(today - timedelta(days=1)).isoformat(),
    )
    response = client.post(
        "/api/farmaci", json=payload, headers={"X-User-Token": token}
    )
    assert response.status_code == 422
    assert "data_fine deve essere >= data_inizio" in str(response.json())


def test_put_happy_full_replace(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T6: PUT happy full replace -> 200 + body con campi aggiornati."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="Originale")
    payload = _payload_fisso(nome="Aggiornato", funzione="Nuova funzione")
    response = client.put(
        f"/api/farmaci/{farmaco_id}",
        json=payload,
        headers={"X-User-Token": token},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["nome"] == "Aggiornato"
    assert body["funzione"] == "Nuova funzione"
    assert body["id"] == farmaco_id


def test_put_not_found(
    client: TestClient, seed_owner_test: tuple[str, int]
) -> None:
    """T7: PUT id inesistente -> 404 RepositoryError NOT_FOUND."""
    token, _ = seed_owner_test
    response = client.put(
        "/api/farmaci/99999",
        json=_payload_fisso(),
        headers={"X-User-Token": token},
    )
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "NOT_FOUND"
    assert body["error"]["severity"] == "warning"
    assert "non trovato" in body["error"]["message"]


def test_put_scope_violation_other_user(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_user: Callable[..., tuple[str, int]],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T8: PUT su farmaco di altro utente -> 404 (security-by-obscurity, NON 403)."""
    owner_token, _ = seed_owner_test
    _, other_user_id = insert_test_user(nome="Mario", ruolo="paziente")
    farmaco_di_mario = insert_test_farmaco(utente_id=other_user_id, nome="MarioPills")
    response = client.put(
        f"/api/farmaci/{farmaco_di_mario}",
        json=_payload_fisso(nome="TentativoIntrusione"),
        headers={"X-User-Token": owner_token},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_delete_happy_soft(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
    db_test_pool,
) -> None:
    """T9: DELETE happy SOFT -> 204 + DB verify attivo=0 row preservata."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="DaCancellare")
    response = client.delete(
        f"/api/farmaci/{farmaco_id}", headers={"X-User-Token": token}
    )
    assert response.status_code == 204
    conn = db_test_pool.get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT attivo FROM farmaci WHERE id = %s", (farmaco_id,))
        row = cur.fetchone()
        cur.close()
    finally:
        conn.close()
    assert row is not None
    assert row[0] == 0


def test_delete_already_inactive(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T10: DELETE su farmaco gia attivo=FALSE -> 404 (F3-S2.B-bis ratified)."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(
        utente_id=owner_id, nome="GiaInattivo", attivo=False
    )
    response = client.delete(
        f"/api/farmaci/{farmaco_id}", headers={"X-User-Token": token}
    )
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "NOT_FOUND"
    assert "gia inattivo" in body["error"]["message"]


def test_delete_not_found(
    client: TestClient, seed_owner_test: tuple[str, int]
) -> None:
    """T11: DELETE id inesistente -> 404 NOT_FOUND."""
    token, _ = seed_owner_test
    response = client.delete(
        "/api/farmaci/99999", headers={"X-User-Token": token}
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_delete_then_get_filters_out(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """T12: DELETE poi GET non lista farmaco soft-deleted."""
    token, owner_id = seed_owner_test
    farmaco_id = insert_test_farmaco(utente_id=owner_id, nome="EsclusoDaGet")
    delete_response = client.delete(
        f"/api/farmaci/{farmaco_id}", headers={"X-User-Token": token}
    )
    assert delete_response.status_code == 204
    get_response = client.get(
        "/api/farmaci", headers={"X-User-Token": token}
    )
    assert get_response.status_code == 200
    ids = [f["id"] for f in get_response.json()]
    assert farmaco_id not in ids


def test_post_happy_fisso_date(
    client: TestClient, seed_owner_test: tuple[str, int]
) -> None:
    """T13: POST fisso_date con intervallo_ore None -> 201."""
    token, _ = seed_owner_test
    payload = _payload_fisso(nome="TestFissoDate", tipo_frequenza="fisso_date")
    response = client.post(
        "/api/farmaci", json=payload, headers={"X-User-Token": token}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["tipo_frequenza"] == "fisso_date"
    assert body["intervallo_ore"] is None


def test_post_fail_fisso_date_with_intervallo_ore(
    client: TestClient, seed_owner_test: tuple[str, int]
) -> None:
    """T14: POST fisso_date + intervallo_ore valorizzato -> 422 (cross-field validator)."""
    token, _ = seed_owner_test
    payload = _payload_fisso(
        nome="FissoDateKo", tipo_frequenza="fisso_date", intervallo_ore="8.0"
    )
    response = client.post(
        "/api/farmaci", json=payload, headers={"X-User-Token": token}
    )
    assert response.status_code == 422
    assert "intervallo_ore deve essere NULL" in str(response.json())
