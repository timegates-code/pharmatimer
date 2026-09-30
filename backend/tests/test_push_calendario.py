"""
PUT /api/push/calendario -- decisions 8, 11 and 12 of STATO_CORRENTE.md.

- The publication replaces the user's calendar whole: a dose the phone no
  longer publishes is gone for the planner too (M1), and every new entry is
  there (M2 on the channel). Another user's calendar is not touched.
- Every farmaco must be the caller's: one that is not refuses the whole
  publication, and the previous calendar stays as it was.
- ora_ricalcolata is wall clock, naive and whole-second, like the log column
  the planner compares it with by equality (decision 11), in both directions.
- The end-of-horizon notice comes after the window of the last dose
  (condition of decision 12), in both directions at the exact boundary.

The pins have their rows in scripts/audit/mutazioni.py.
"""
from datetime import date, datetime

from .aiuti_push import (
    ADESSO,
    MINUTO,
    calendario,
    fissa_orologio,
    nuovo_device,
    righe,
    voce,
)

_CALENDARIO = (
    "SELECT farmaco_id, data, dose_numero, istante_ms, ora_ricalcolata, titolo, corpo "
    "FROM push_calendario WHERE utente_id = %s ORDER BY farmaco_id, data, dose_numero"
)


def _put(client, token, corpo):
    return client.put("/api/push/calendario", json=corpo, headers={"X-User-Token": token})


def test_pubblicazione_sostituisce_il_calendario_intero(
    client, seed_owner_test, insert_test_farmaco, db_test_pool, monkeypatch
) -> None:
    token, u = seed_owner_test
    f1 = insert_test_farmaco(utente_id=u, nome="Uno")
    f2 = insert_test_farmaco(utente_id=u, nome="Due")
    d = nuovo_device()
    fissa_orologio(monkeypatch, ADESSO)
    prima = calendario(
        d,
        [
            voce(f1, "2026-10-01", 1, ADESSO + 60 * MINUTO),
            voce(f1, "2026-10-01", 2, ADESSO + 600 * MINUTO),
        ],
    )
    assert _put(client, token, prima).status_code == 200

    fissa_orologio(monkeypatch, ADESSO + MINUTO)
    # Yesterday's dose recalculated into today: keyed by its own day, placed
    # at its effective instant (decision 8), with the wall value it came from.
    seconda = calendario(
        d,
        [
            voce(
                f2,
                "2026-09-30",
                3,
                ADESSO + 90 * MINUTO,
                ora_ricalcolata="2026-10-01T11:30:00",
                titolo="Due",
                corpo="Dopo colazione",
            )
        ],
    )
    r = _put(client, token, seconda)
    assert r.status_code == 200
    assert r.json() == {
        "device_id": d,
        "pubblicata_ms": ADESSO + MINUTO,
        "orizzonte_fino_ms": seconda["orizzonte_fino_ms"],
        "avviso_fine_ms": seconda["avviso_fine_ms"],
        "avviso_fine_entro_ms": seconda["avviso_fine_entro_ms"],
        "voci": 1,
    }
    assert righe(db_test_pool, _CALENDARIO, (u,)) == [
        {
            "farmaco_id": f2,
            "data": date(2026, 9, 30),
            "dose_numero": 3,
            "istante_ms": ADESSO + 90 * MINUTO,
            "ora_ricalcolata": datetime(2026, 10, 1, 11, 30),
            "titolo": "Due",
            "corpo": "Dopo colazione",
        }
    ]
    assert righe(
        db_test_pool,
        "SELECT device_id, pubblicata_ms, avviso_fine_ms, avviso_fine_entro_ms, voci "
        "FROM push_pubblicazioni WHERE utente_id = %s",
        (u,),
    ) == [
        {
            "device_id": d,
            "pubblicata_ms": ADESSO + MINUTO,
            "avviso_fine_ms": seconda["avviso_fine_ms"],
            "avviso_fine_entro_ms": seconda["avviso_fine_entro_ms"],
            "voci": 1,
        }
    ]


def test_pubblicazione_non_tocca_il_calendario_di_un_altro_utente(
    client, seed_owner_test, insert_test_user, insert_test_farmaco, db_test_pool, monkeypatch
) -> None:
    token_u, u = seed_owner_test
    token_v, v = insert_test_user(nome="Altro")
    fu = insert_test_farmaco(utente_id=u, nome="DiU")
    fv = insert_test_farmaco(utente_id=v, nome="DiV")
    fissa_orologio(monkeypatch, ADESSO)
    assert _put(
        client, token_v, calendario(nuovo_device(), [voce(fv, "2026-10-01", 1, ADESSO + MINUTO)])
    ).status_code == 200
    assert _put(
        client, token_u, calendario(nuovo_device(), [voce(fu, "2026-10-01", 1, ADESSO + MINUTO)])
    ).status_code == 200
    assert [r["farmaco_id"] for r in righe(db_test_pool, _CALENDARIO, (v,))] == [fv]
    assert [r["farmaco_id"] for r in righe(db_test_pool, _CALENDARIO, (u,))] == [fu]


def test_pubblicazione_di_un_farmaco_altrui_e_rifiutata_e_non_tocca_il_calendario(
    client, seed_owner_test, insert_test_user, insert_test_farmaco, db_test_pool, monkeypatch
) -> None:
    token_u, u = seed_owner_test
    _, v = insert_test_user(nome="Altro")
    fu1 = insert_test_farmaco(utente_id=u, nome="Uno")
    fu2 = insert_test_farmaco(utente_id=u, nome="Due")
    fv = insert_test_farmaco(utente_id=v, nome="DiV")
    d = nuovo_device()
    fissa_orologio(monkeypatch, ADESSO)
    assert _put(
        client, token_u, calendario(d, [voce(fu1, "2026-10-01", 1, ADESSO + MINUTO)])
    ).status_code == 200
    fissa_orologio(monkeypatch, ADESSO + MINUTO)
    r = _put(
        client,
        token_u,
        calendario(
            d,
            [
                voce(fu2, "2026-10-01", 1, ADESSO + 2 * MINUTO),
                voce(fv, "2026-10-01", 1, ADESSO + 3 * MINUTO),
            ],
        ),
    )
    assert r.status_code == 404
    assert [r["farmaco_id"] for r in righe(db_test_pool, _CALENDARIO, (u,))] == [fu1]
    assert righe(
        db_test_pool, "SELECT pubblicata_ms, voci FROM push_pubblicazioni WHERE utente_id = %s", (u,)
    ) == [{"pubblicata_ms": ADESSO, "voci": 1}]


def test_ora_ricalcolata_con_fuso_e_rifiutata(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, u = seed_owner_test
    f = insert_test_farmaco(utente_id=u, nome="Uno")
    for valore in ("2026-10-01T11:30:00+02:00", "2026-10-01T09:30:00Z"):
        corpo = calendario(
            nuovo_device(),
            [voce(f, "2026-10-01", 1, ADESSO + MINUTO, ora_ricalcolata=valore)],
        )
        assert _put(client, token, corpo).status_code == 422
    assert righe(db_test_pool, _CALENDARIO, (u,)) == []


def test_ora_ricalcolata_con_frazioni_di_secondo_e_rifiutata(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, u = seed_owner_test
    f = insert_test_farmaco(utente_id=u, nome="Uno")
    corpo = calendario(
        nuovo_device(),
        [voce(f, "2026-10-01", 1, ADESSO + MINUTO, ora_ricalcolata="2026-10-01T11:30:00.500")],
    )
    assert _put(client, token, corpo).status_code == 422
    assert righe(db_test_pool, _CALENDARIO, (u,)) == []


def test_avviso_fine_dopo_la_finestra_dell_ultima_dose(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, u = seed_owner_test
    f = insert_test_farmaco(utente_id=u, nome="Uno")
    ultima = ADESSO + 600 * MINUTO
    voci = [voce(f, "2026-10-01", 1, ADESSO + MINUTO), voce(f, "2026-10-01", 2, ultima)]
    # Decision 16: the window of a dose is [istante, istante + 20 min).
    fine_finestra = ultima + 20 * MINUTO
    presto = calendario(nuovo_device(), voci, avviso_fine_ms=fine_finestra - 1)
    assert _put(client, token, presto).status_code == 422
    assert righe(db_test_pool, _CALENDARIO, (u,)) == []
    al_limite = calendario(nuovo_device(), voci, avviso_fine_ms=fine_finestra)
    assert _put(client, token, al_limite).status_code == 200
    assert len(righe(db_test_pool, _CALENDARIO, (u,))) == 2


def test_una_voce_per_dose_ed_entro_dopo_avviso(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, u = seed_owner_test
    f = insert_test_farmaco(utente_id=u, nome="Uno")
    doppia = calendario(
        nuovo_device(),
        [voce(f, "2026-10-01", 1, ADESSO + MINUTO), voce(f, "2026-10-01", 1, ADESSO + 2 * MINUTO)],
    )
    assert _put(client, token, doppia).status_code == 422
    corpo = calendario(nuovo_device(), [voce(f, "2026-10-01", 1, ADESSO + MINUTO)])
    corpo["avviso_fine_entro_ms"] = corpo["avviso_fine_ms"]
    assert _put(client, token, corpo).status_code == 422
    assert righe(db_test_pool, _CALENDARIO, (u,)) == []


def test_calendario_vuoto_svuota(
    client, seed_owner_test, insert_test_farmaco, db_test_pool, monkeypatch
) -> None:
    token, u = seed_owner_test
    f = insert_test_farmaco(utente_id=u, nome="Uno")
    fissa_orologio(monkeypatch, ADESSO)
    assert _put(
        client, token, calendario(nuovo_device(), [voce(f, "2026-10-01", 1, ADESSO + MINUTO)])
    ).status_code == 200
    r = _put(client, token, calendario(nuovo_device(), []))
    assert r.status_code == 200
    assert r.json()["voci"] == 0
    assert righe(db_test_pool, _CALENDARIO, (u,)) == []
