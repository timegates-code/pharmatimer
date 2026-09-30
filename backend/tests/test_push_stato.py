"""
GET /api/push/chiave and GET /api/push/stato -- Web Push channel, branch A.
Decisions 9, 12, 15 and 16 of STATO_CORRENTE.md.

- chiave: 200 with the public key when the PEM reads, 503 when it does not,
  and a missing PEM is never created (decision 15). Pinned in both directions.
- stato: always 200 while the DB answers. The heartbeat's age is measured on
  the server clock alone, and no row means never started (condition of
  decision 9); the channel says why it is off (decision 15); the tolerance
  comes from the server (decisions 12 and 16); only the caller's own rows.

The pins have their rows in scripts/audit/mutazioni.py.
"""
from .aiuti_push import (
    ADESSO,
    MINUTO,
    SUB,
    calendario,
    configura_vapid,
    esegui,
    fissa_orologio,
    iscrizione,
    nuovo_device,
    righe,
    voce,
)


def test_chiave_con_pem_valido(client, seed_owner_test, pem_vapid, monkeypatch) -> None:
    token, _ = seed_owner_test
    pem, attesa = pem_vapid
    configura_vapid(monkeypatch, pem, SUB)
    r = client.get("/api/push/chiave", headers={"X-User-Token": token})
    assert r.status_code == 200
    assert r.json() == {"chiave_pubblica": attesa}


def test_chiave_senza_pem_503_e_nessun_file_creato(
    client, seed_owner_test, tmp_path, monkeypatch
) -> None:
    token, _ = seed_owner_test
    manca = tmp_path / "vapid.pem"
    for pem, motivo in ((None, "pem_non_configurato"), (str(manca), "pem_illeggibile")):
        configura_vapid(monkeypatch, pem, SUB)
        r = client.get("/api/push/chiave", headers={"X-User-Token": token})
        assert r.status_code == 503
        assert motivo in r.json()["error"]["message"]
    assert not manca.exists()


def test_chiave_senza_sub_la_serve_e_lo_stato_dice_perche(
    client, seed_owner_test, pem_vapid, monkeypatch
) -> None:
    # A subscription binds to the key only: the phone may subscribe, and
    # /stato says why nothing can leave.
    token, _ = seed_owner_test
    pem, attesa = pem_vapid
    configura_vapid(monkeypatch, pem, None)
    r = client.get("/api/push/chiave", headers={"X-User-Token": token})
    assert r.status_code == 200
    assert r.json()["chiave_pubblica"] == attesa
    s = client.get("/api/push/stato", headers={"X-User-Token": token}).json()
    assert s["canale"] == {"attivo": False, "motivo": "sub_assente"}


def test_chiave_e_stato_chiedono_un_token_valido(client, monkeypatch) -> None:
    configura_vapid(monkeypatch, None, None)
    for percorso in ("/api/push/chiave", "/api/push/stato"):
        r = client.get(percorso, headers={"X-User-Token": "non-un-token"})
        assert r.status_code == 401


def test_stato_mai_partito(client, seed_owner_test, monkeypatch) -> None:
    token, _ = seed_owner_test
    fissa_orologio(monkeypatch, ADESSO)
    configura_vapid(monkeypatch, None, None)
    r = client.get("/api/push/stato", headers={"X-User-Token": token})
    assert r.status_code == 200
    assert r.json() == {
        "ora_server_ms": ADESSO,
        "tolleranza_min": 20,
        "canale": {"attivo": False, "motivo": "pem_non_configurato"},
        "pianificatore": None,
        "iscrizioni": [],
        "pubblicazione": None,
        "ultimi_invii": [],
        "ultimi_avvisi_fine": [],
    }


def test_stato_eta_sul_solo_orologio_del_server(
    client, seed_owner_test, db_test_pool, pem_vapid, monkeypatch
) -> None:
    token, _ = seed_owner_test
    pem, _ = pem_vapid
    fissa_orologio(monkeypatch, ADESSO)
    configura_vapid(monkeypatch, pem, SUB)
    esegui(
        db_test_pool,
        "INSERT INTO push_pianificatore (nome, ultima_passata_ms, esito, dettaglio) "
        "VALUES ('pianificatore', %s, 'ok', NULL)",
        (ADESSO - 7 * MINUTO,),
    )
    s = client.get("/api/push/stato", headers={"X-User-Token": token}).json()
    assert s["canale"] == {"attivo": True, "motivo": None}
    assert s["pianificatore"] == {
        "ultima_passata_ms": ADESSO - 7 * MINUTO,
        "eta_ms": 7 * MINUTO,
        "esito": "ok",
        "dettaglio": None,
    }
    esegui(
        db_test_pool,
        "UPDATE push_pianificatore SET ultima_passata_ms = %s, esito = 'chiave_assente', "
        "dettaglio = 'pem_illeggibile' WHERE nome = 'pianificatore'",
        (ADESSO - 30_000,),
    )
    s = client.get("/api/push/stato", headers={"X-User-Token": token}).json()
    assert s["pianificatore"] == {
        "ultima_passata_ms": ADESSO - 30_000,
        "eta_ms": 30_000,
        "esito": "chiave_assente",
        "dettaglio": "pem_illeggibile",
    }


def test_stato_mostra_solo_i_dati_dell_utente(
    client, seed_owner_test, insert_test_user, insert_test_farmaco, db_test_pool, monkeypatch
) -> None:
    token_u, _ = seed_owner_test
    token_v, v = insert_test_user(nome="Altro")
    fissa_orologio(monkeypatch, ADESSO)
    configura_vapid(monkeypatch, None, None)
    dv = nuovo_device()
    fv = insert_test_farmaco(utente_id=v, nome="FarmacoV")
    intestazione_v = {"X-User-Token": token_v}
    assert client.put(
        "/api/push/iscrizione", json=iscrizione("https://push.example/v", dv), headers=intestazione_v
    ).status_code == 200
    assert client.put(
        "/api/push/calendario",
        json=calendario(dv, [voce(fv, "2026-10-01", 1, ADESSO + 60 * MINUTO)]),
        headers=intestazione_v,
    ).status_code == 200
    sub_v = righe(db_test_pool, "SELECT id FROM push_subscriptions WHERE utente_id = %s", (v,))
    esegui(
        db_test_pool,
        "INSERT INTO push_dispatch (subscription_id, utente_id, farmaco_id, data, dose_numero, "
        "istante_ms, forma, stato, deciso_ms, inviato_ms, http_status) "
        "VALUES (%s, %s, %s, '2026-10-01', 1, %s, 'dose', 'accettato', %s, %s, 201)",
        (sub_v[0]["id"], v, fv, ADESSO - MINUTO, ADESSO - MINUTO, ADESSO - MINUTO + 500),
    )
    esegui(
        db_test_pool,
        "INSERT INTO push_avvisi_fine (subscription_id, utente_id, avviso_fine_ms, entro_ms, "
        "stato, motivo, deciso_ms) VALUES (%s, %s, %s, %s, 'non_inviato', 'scaduto', %s)",
        (sub_v[0]["id"], v, ADESSO - 90 * MINUTO, ADESSO - 30 * MINUTO, ADESSO),
    )

    s_u = client.get("/api/push/stato", headers={"X-User-Token": token_u}).json()
    assert (s_u["iscrizioni"], s_u["pubblicazione"], s_u["ultimi_invii"], s_u["ultimi_avvisi_fine"]) == (
        [],
        None,
        [],
        [],
    )

    s_v = client.get("/api/push/stato", headers=intestazione_v).json()
    assert [i["device_id"] for i in s_v["iscrizioni"]] == [dv]
    assert s_v["pubblicazione"]["voci"] == 1
    assert s_v["ultimi_invii"] == [
        {
            "device_id": dv,
            "farmaco_id": fv,
            "data": "2026-10-01",
            "dose_numero": 1,
            "istante_ms": ADESSO - MINUTO,
            "forma": "dose",
            "stato": "accettato",
            "motivo": None,
            "http_status": 201,
            "deciso_ms": ADESSO - MINUTO,
            "inviato_ms": ADESSO - MINUTO + 500,
        }
    ]
    assert s_v["ultimi_avvisi_fine"] == [
        {
            "device_id": dv,
            "avviso_fine_ms": ADESSO - 90 * MINUTO,
            "entro_ms": ADESSO - 30 * MINUTO,
            "stato": "non_inviato",
            "motivo": "scaduto",
            "http_status": None,
            "deciso_ms": ADESSO,
            "inviato_ms": None,
        }
    ]
