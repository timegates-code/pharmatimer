"""
PUT /api/push/iscrizione and DELETE /api/push/iscrizione/{device_id}.
Decision 2 of STATO_CORRENTE.md (getSubscription() at every opening) and
v07_push.sql (one phone keeps one active subscription).

- A new subscription of a phone turns off its previous one: two active
  subscriptions on one phone would take every dose to it twice (M1). The
  other direction is pinned too: the other phones and the other users keep
  theirs (M2 on their channel).
- The toggle off turns off that phone's subscription and nothing else, in
  both directions.
- created_at is the start of the current activation for the current user:
  a confirmation of an active row leaves it, a reactivation or a change of
  user restarts it (Roberto, 2026-09-30). The planner writes no 'scaduto'
  for a window closed before it. Both directions.

The pins have their rows in scripts/audit/mutazioni.py.
"""
import hashlib

from .aiuti_push import (
    ADESSO,
    attivazione_s,
    fissa_orologio,
    imposta_attivazione,
    iscrizione,
    nuovo_device,
    righe,
)

# 2026-01-01T00:00:00Z, in seconds: an activation far older than the test run.
VECCHIA = 1_767_225_600

E1 = "https://web.push.apple.com/QmUno"
E2 = "https://web.push.apple.com/QmDue"
E3 = "https://web.push.apple.com/QmTre"
E4 = "https://web.push.apple.com/QmQuattro"


def _put(client, token, corpo):
    return client.put("/api/push/iscrizione", json=corpo, headers={"X-User-Token": token})


def _stato_endpoint(pool) -> dict:
    return {
        r["endpoint"]: (bool(r["attiva"]), r["disattivata_ms"], r["motivo_disattivazione"])
        for r in righe(
            pool,
            "SELECT endpoint, attiva, disattivata_ms, motivo_disattivazione FROM push_subscriptions",
        )
    }


def test_iscrizione_nuova_e_confermata(client, seed_owner_test, db_test_pool, monkeypatch) -> None:
    token, u = seed_owner_test
    fissa_orologio(monkeypatch, ADESSO)
    d = nuovo_device()
    r = _put(client, token, iscrizione(E1, d, device_label="iPhone"))
    assert r.status_code == 200
    assert r.json() == {
        "device_id": d,
        "device_label": "iPhone",
        "attiva": True,
        "confermata_ms": ADESSO,
        "disattivata_ms": None,
        "motivo_disattivazione": None,
    }
    riga = righe(
        db_test_pool, "SELECT utente_id, endpoint, endpoint_hash, device_id FROM push_subscriptions"
    )
    assert riga == [
        {
            "utente_id": u,
            "endpoint": E1,
            "endpoint_hash": hashlib.sha256(E1.encode("utf-8")).hexdigest(),
            "device_id": d,
        }
    ]


def test_iscrizione_ripetuta_aggiorna_la_stessa_riga(
    client, seed_owner_test, db_test_pool, monkeypatch
) -> None:
    token, _ = seed_owner_test
    d = nuovo_device()
    fissa_orologio(monkeypatch, ADESSO)
    _put(client, token, iscrizione(E1, d, device_label="iPhone"))
    fissa_orologio(monkeypatch, ADESSO + 60_000)
    r = _put(client, token, iscrizione(E1, d))
    assert r.status_code == 200
    assert r.json()["confermata_ms"] == ADESSO + 60_000
    assert r.json()["device_label"] == "iPhone"  # kept when the phone does not resend it
    assert len(righe(db_test_pool, "SELECT id FROM push_subscriptions")) == 1


def test_iscrizione_nuova_sostituisce_la_vecchia_dello_stesso_telefono(
    client, seed_owner_test, db_test_pool, monkeypatch
) -> None:
    token, _ = seed_owner_test
    d = nuovo_device()
    fissa_orologio(monkeypatch, ADESSO)
    _put(client, token, iscrizione(E1, d))
    fissa_orologio(monkeypatch, ADESSO + 1_000)
    assert _put(client, token, iscrizione(E2, d)).status_code == 200
    assert _stato_endpoint(db_test_pool) == {
        E1: (False, ADESSO + 1_000, "sostituita"),
        E2: (True, None, None),
    }


def test_iscrizione_non_tocca_altri_telefoni_ne_altri_utenti(
    client, seed_owner_test, insert_test_user, db_test_pool, monkeypatch
) -> None:
    token_u, _ = seed_owner_test
    token_v, _ = insert_test_user(nome="Altro")
    d1, d2 = nuovo_device(), nuovo_device()
    fissa_orologio(monkeypatch, ADESSO)
    _put(client, token_u, iscrizione(E1, d1))
    _put(client, token_u, iscrizione(E2, d2))
    # The same phone id under another user: a phone that changed token.
    _put(client, token_v, iscrizione(E3, d1))
    fissa_orologio(monkeypatch, ADESSO + 1_000)
    _put(client, token_u, iscrizione(E4, d1))
    assert _stato_endpoint(db_test_pool) == {
        E1: (False, ADESSO + 1_000, "sostituita"),
        E2: (True, None, None),
        E3: (True, None, None),
        E4: (True, None, None),
    }


def test_iscrizione_passa_all_utente_che_la_conferma(
    client, seed_owner_test, insert_test_user, db_test_pool, monkeypatch
) -> None:
    token_u, _ = seed_owner_test
    token_v, v = insert_test_user(nome="Altro")
    d = nuovo_device()
    fissa_orologio(monkeypatch, ADESSO)
    _put(client, token_u, iscrizione(E1, d))
    _put(client, token_v, iscrizione(E1, d))
    assert righe(db_test_pool, "SELECT utente_id, attiva FROM push_subscriptions") == [
        {"utente_id": v, "attiva": 1}
    ]
    stato_u = client.get("/api/push/stato", headers={"X-User-Token": token_u}).json()
    assert stato_u["iscrizioni"] == []


def test_iscrizione_rifiuta_chiavi_e_endpoint_malformati(
    client, seed_owner_test, db_test_pool
) -> None:
    token, _ = seed_owner_test
    d = nuovo_device()
    buona = iscrizione(E1, d)
    corte = iscrizione(E1, d)
    corte["keys"]["p256dh"] = corte["keys"]["p256dh"][:-2]
    compressa = iscrizione(E1, d)
    compressa["keys"]["p256dh"] = "Ag" + compressa["keys"]["p256dh"][2:]
    auth_corta = iscrizione(E1, d)
    auth_corta["keys"]["auth"] = auth_corta["keys"]["auth"][:-2]
    non_b64 = iscrizione(E1, d)
    non_b64["keys"]["auth"] = "!!" + non_b64["keys"]["auth"][2:]
    for corpo in (
        {**buona, "endpoint": "http://web.push.apple.com/QmUno"},
        {**buona, "device_id": "non-un-uuid"},
        corte,
        compressa,
        auth_corta,
        non_b64,
    ):
        assert _put(client, token, corpo).status_code == 422
    assert righe(db_test_pool, "SELECT id FROM push_subscriptions") == []


def test_revoca_spegne_solo_quel_telefono_dell_utente(
    client, seed_owner_test, insert_test_user, db_test_pool, monkeypatch
) -> None:
    token_u, _ = seed_owner_test
    token_v, _ = insert_test_user(nome="Altro")
    d1, d2 = nuovo_device(), nuovo_device()
    fissa_orologio(monkeypatch, ADESSO)
    _put(client, token_u, iscrizione(E1, d1))
    _put(client, token_u, iscrizione(E2, d2))
    _put(client, token_v, iscrizione(E3, d1))
    fissa_orologio(monkeypatch, ADESSO + 5_000)
    r = client.delete(f"/api/push/iscrizione/{d1}", headers={"X-User-Token": token_u})
    assert r.status_code == 204
    assert _stato_endpoint(db_test_pool) == {
        E1: (False, ADESSO + 5_000, "revocata"),
        E2: (True, None, None),
        E3: (True, None, None),
    }


def test_revoca_ripetuta_resta_204(client, seed_owner_test, db_test_pool, monkeypatch) -> None:
    token, _ = seed_owner_test
    d = nuovo_device()
    fissa_orologio(monkeypatch, ADESSO)
    _put(client, token, iscrizione(E1, d))
    for _ in range(2):
        r = client.delete(f"/api/push/iscrizione/{d}", headers={"X-User-Token": token})
        assert r.status_code == 204
    r = client.delete(f"/api/push/iscrizione/{nuovo_device()}", headers={"X-User-Token": token})
    assert r.status_code == 204
    assert _stato_endpoint(db_test_pool) == {E1: (False, ADESSO, "revocata")}


def test_attivazione_resta_alla_conferma_di_una_riga_attiva(
    client, seed_owner_test, db_test_pool, monkeypatch
) -> None:
    token, _ = seed_owner_test
    d = nuovo_device()
    fissa_orologio(monkeypatch, ADESSO)
    _put(client, token, iscrizione(E1, d))
    imposta_attivazione(db_test_pool, E1, VECCHIA)
    fissa_orologio(monkeypatch, ADESSO + 60_000)
    assert _put(client, token, iscrizione(E1, d)).status_code == 200
    assert attivazione_s(db_test_pool, E1) == VECCHIA


def test_attivazione_riparte_dopo_una_riattivazione_o_un_cambio_di_utente(
    client, seed_owner_test, insert_test_user, db_test_pool, monkeypatch
) -> None:
    token_u, _ = seed_owner_test
    token_v, _ = insert_test_user(nome="Altro")
    d = nuovo_device()
    fissa_orologio(monkeypatch, ADESSO)
    _put(client, token_u, iscrizione(E1, d))
    imposta_attivazione(db_test_pool, E1, VECCHIA)
    # Off, then on again with the same endpoint: a new activation.
    client.delete(f"/api/push/iscrizione/{d}", headers={"X-User-Token": token_u})
    _put(client, token_u, iscrizione(E1, d))
    assert attivazione_s(db_test_pool, E1) > VECCHIA
    # Still active, confirmed by another user: a new activation for that user.
    imposta_attivazione(db_test_pool, E1, VECCHIA)
    _put(client, token_v, iscrizione(E1, d))
    assert attivazione_s(db_test_pool, E1) > VECCHIA
