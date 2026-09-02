"""
PharmaTimer -- decisione 2: intervallo minimo LATO SERVER, in minuti reali.

Ratifica: una presa si registra SEMPRE; se e troppo vicina a un altra presa
dello stesso farmaco (qualunque dose_numero, qualunque data, nei due versi:
P3=B) la risposta porta un avviso. Il ricalcolo nested e verificato: sotto il
minimo dalla presa appena registrata viene rifiutato con codice proprio sul
201, e la presa resta registrata senza ricalcolo. Nessuna migrazione.

Ogni test dichiara i due esiti che distingue nel proprio nome: il verso
"avviso" e il verso "nessun avviso", il rifiuto e la applicazione. Il caso
DST e anche il bersaglio del controllo positivo per mutazione: una
`minuti_reali` naive rende 480 al posto di 420 e lo fa arrossare.

Date FISSE e non `date.today()`: i giorni delle transizioni sono un dato del
dominio (29 marzo e 25 ottobre 2026), e lo slot e UNIQUE per (data, dose).
"""
from __future__ import annotations

import uuid
from collections.abc import Callable
from datetime import date, datetime
from datetime import time as dtime

from fastapi.testclient import TestClient

D = date(2026, 7, 15)
D1 = date(2026, 7, 16)


def _auth(token: str) -> dict:
    return {"X-User-Token": token}


def _farmaco(insert_test_farmaco, owner_id: int, minimo: str | None = "4.0", nome: str = "Ogni8") -> int:
    return insert_test_farmaco(
        utente_id=owner_id,
        nome=nome,
        tipo_frequenza="intervallo",
        intervallo_ore="8.0",
        intervallo_minimo_ore=minimo,
        dosi_giornaliere=3,
    )


def _ricalcolo(data: date, dose: int, ora: dtime) -> dict:
    return {
        "dose_numero": dose,
        "data": data.isoformat(),
        "ora_prevista": ora.strftime("%H:%M:%S"),
        "ora_ricalcolata": datetime.combine(data, ora).isoformat(),
        "gap_minuti": 0,
    }


def _presa(
    client: TestClient,
    token: str,
    fid: int,
    data: date,
    dose: int,
    ora: dtime,
    *,
    ricalcolo: dict | None = None,
    targa: str | None = None,
):
    payload = {
        "data": data.isoformat(),
        "dose_numero": dose,
        "ora_prevista": ora.strftime("%H:%M:%S"),
        "ora_effettiva": datetime.combine(data, ora).isoformat(),
        "delta_minuti": 0,
        "gap_minuti": 0,
        "recupero_minuti": 0,
        "note": None,
    }
    if ricalcolo is not None:
        payload["ricalcolo_dose_successiva"] = ricalcolo
    if targa is not None:
        payload["client_op_id"] = targa
    return client.post(f"/api/farmaci/{fid}/log/presa", json=payload, headers=_auth(token))


def _righe(client: TestClient, token: str, fid: int, da: date, a: date) -> list[dict]:
    r = client.get(
        f"/api/farmaci/{fid}/log",
        params={"data_from": da.isoformat(), "data_to": a.isoformat()},
        headers=_auth(token),
    )
    assert r.status_code == 200
    return r.json()


# ---------------------------------------------------------------- avviso, due versi


def test_presa_troppo_vicina_registrata_con_avviso_e_non_rifiutata(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Dose 2 alle 10:00, un ora dopo la dose 1: 201, stato presa, avviso.
    Entrambe le righe sono 'presa' sul server: la presa NON viene rifiutata."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id)
    r1 = _presa(client, token, fid, D, 1, dtime(9, 0))
    assert r1.status_code == 201
    assert r1.json()["avviso"] is None
    r2 = _presa(client, token, fid, D, 2, dtime(10, 0))
    assert r2.status_code == 201
    body = r2.json()
    assert body["stato"] == "presa"
    assert body["dedup"] is False
    assert body["avviso"] == {
        "codice": "PRESA_SOTTO_INTERVALLO_MINIMO",
        "lato": "precedente",
        "minuti_dalla_vicina": 60,
        "intervallo_minimo_minuti": 240,
        "ora_effettiva_vicina": "2026-07-15T09:00:00",
    }
    righe = _righe(client, token, fid, D, D)
    assert [(x["dose_numero"], x["stato"]) for x in righe] == [(1, "presa"), (2, "presa")]


def test_presa_lontana_senza_avviso(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Dose 2 alle 17:00, otto ore dopo: nessun avviso (verso opposto)."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id)
    assert _presa(client, token, fid, D, 1, dtime(9, 0)).status_code == 201
    r2 = _presa(client, token, fid, D, 2, dtime(17, 0))
    assert r2.status_code == 201
    assert r2.json()["avviso"] is None
    assert r2.json()["ricalcolo"] is None


def test_presa_esattamente_al_minimo_senza_avviso(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Il confine: 240 minuti esatti NON sono sotto il minimo di 240; 239 si."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id)
    assert _presa(client, token, fid, D, 1, dtime(9, 0)).status_code == 201
    assert _presa(client, token, fid, D, 2, dtime(13, 0)).json()["avviso"] is None
    r3 = _presa(client, token, fid, D, 3, dtime(16, 59))
    assert r3.json()["avviso"]["minuti_dalla_vicina"] == 239


def test_vicina_successiva_su_presa_retroattiva(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """P3=B: la dose 1 registrata DOPO la dose 2 ma con orario ANTERIORE trova
    la vicina sul lato 'successiva'. Un confronto con la sola precedente qui
    tacerebbe."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id)
    assert _presa(client, token, fid, D, 2, dtime(17, 0)).status_code == 201
    r1 = _presa(client, token, fid, D, 1, dtime(15, 30))
    assert r1.status_code == 201
    assert r1.json()["stato"] == "presa"
    assert r1.json()["avviso"] == {
        "codice": "PRESA_SOTTO_INTERVALLO_MINIMO",
        "lato": "successiva",
        "minuti_dalla_vicina": 90,
        "intervallo_minimo_minuti": 240,
        "ora_effettiva_vicina": "2026-07-15T17:00:00",
    }


def test_vicina_su_altra_data_e_altro_dose_numero(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """La sera e la mattina dopo: dose 3 del 15 alle 23:30, dose 1 del 16 alle
    01:00. Slot diversi, date diverse, stesso farmaco: 90 minuti, avviso."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id)
    assert _presa(client, token, fid, D, 3, dtime(23, 30)).status_code == 201
    r = _presa(client, token, fid, D1, 1, dtime(1, 0))
    assert r.status_code == 201
    assert r.json()["avviso"]["lato"] == "precedente"
    assert r.json()["avviso"]["minuti_dalla_vicina"] == 90
    assert r.json()["avviso"]["ora_effettiva_vicina"] == "2026-07-15T23:30:00"


def test_altro_farmaco_non_conta(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Le prese di un altro farmaco non sono vicine: stesso farmaco soltanto."""
    token, owner_id = seed_owner_test
    fa = _farmaco(insert_test_farmaco, owner_id, nome="A")
    fb = _farmaco(insert_test_farmaco, owner_id, nome="B")
    assert _presa(client, token, fa, D, 1, dtime(9, 0)).status_code == 201
    r = _presa(client, token, fb, D, 1, dtime(9, 30))
    assert r.status_code == 201
    assert r.json()["avviso"] is None


def test_avviso_nomina_la_vicina_piu_prossima_fra_le_due(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Precedente a 180 minuti, successiva a 60: lo avviso nomina la successiva."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id)
    assert _presa(client, token, fid, D, 1, dtime(9, 0)).status_code == 201
    assert _presa(client, token, fid, D, 3, dtime(13, 0)).status_code == 201
    r = _presa(client, token, fid, D, 2, dtime(12, 0))
    assert r.json()["avviso"]["lato"] == "successiva"
    assert r.json()["avviso"]["minuti_dalla_vicina"] == 60


# ---------------------------------------------------------------- ricalcolo, due versi


def test_ricalcolo_sotto_minimo_rifiutato_presa_registrata(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Ricalcolo a due ore dalla presa con minimo di quattro: 201, codice
    proprio, nessuna riga D+1, presa registrata."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id)
    r = _presa(client, token, fid, D, 1, dtime(9, 0), ricalcolo=_ricalcolo(D, 2, dtime(11, 0)))
    assert r.status_code == 201
    body = r.json()
    assert body["stato"] == "presa"
    assert body["ricalcolo"] == "rifiutato_intervallo_minimo"
    assert body["avviso"] is None
    righe = _righe(client, token, fid, D, D)
    assert [(x["dose_numero"], x["stato"]) for x in righe] == [(1, "presa")]


def test_ricalcolo_regolare_applicato(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Ricalcolo a otto ore: applicato, D+1 ricalcolata (verso opposto)."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id)
    r = _presa(client, token, fid, D, 1, dtime(9, 0), ricalcolo=_ricalcolo(D, 2, dtime(17, 0)))
    assert r.status_code == 201
    assert r.json()["ricalcolo"] == "applicato"
    righe = _righe(client, token, fid, D, D)
    dose2 = next(x for x in righe if x["dose_numero"] == 2)
    assert dose2["stato"] == "ricalcolata"
    assert dose2["ora_ricalcolata"] == "2026-07-15T17:00:00"


def test_ricalcolo_omesso_stato_destinazione_nominato(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """La guardia s.6.269 (D+1 gia sospesa) resta una omissione, ma ora ha un
    nome sul filo (P5=A). La dose 2 resta sospesa."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id)
    rs = client.post(
        f"/api/farmaci/{fid}/log/sospesa",
        json={"data": D.isoformat(), "dose_numero": 2, "ora_prevista": "16:00:00"},
        headers=_auth(token),
    )
    assert rs.status_code == 201
    assert rs.json()["avviso"] is None
    assert rs.json()["ricalcolo"] is None
    r = _presa(client, token, fid, D, 1, dtime(9, 0), ricalcolo=_ricalcolo(D, 2, dtime(17, 0)))
    assert r.status_code == 201
    assert r.json()["ricalcolo"] == "omesso_stato_destinazione"
    dose2 = next(x for x in _righe(client, token, fid, D, D) if x["dose_numero"] == 2)
    assert dose2["stato"] == "sospesa"


def test_minimo_nullo_nessuna_guardia(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """P2=A: intervallo_minimo_ore NULL -> ne avviso ne rifiuto, anche a 30 minuti."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id, minimo=None)
    assert _presa(client, token, fid, D, 1, dtime(9, 0)).status_code == 201
    r = _presa(client, token, fid, D, 2, dtime(9, 30), ricalcolo=_ricalcolo(D, 3, dtime(10, 0)))
    assert r.status_code == 201
    assert r.json()["avviso"] is None
    assert r.json()["ricalcolo"] == "applicato"


# ---------------------------------------------------------------- minuti REALI (DST)


def test_dst_la_guardia_misura_minuti_reali(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Minimo 7,5 ore = 450 minuti. 23:00 -> 07:00 sono 480 minuti di parete
    sempre, ma 420 REALI nella notte del 29 marzo e 540 in quella del 25
    ottobre. Avviso e rifiuto SOLO nella notte di marzo.

    Bersaglio del controllo positivo per mutazione: una sottrazione naive in
    tempo.minuti_reali rende 480 e questo test arrossa."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id, minimo="7.5")

    # Notte ordinaria, 21 -> 22 marzo: 480 reali >= 450.
    r = _presa(client, token, fid, date(2026, 3, 21), 2, dtime(23, 0),
               ricalcolo=_ricalcolo(date(2026, 3, 22), 1, dtime(7, 0)))
    assert r.json()["ricalcolo"] == "applicato"
    r = _presa(client, token, fid, date(2026, 3, 22), 1, dtime(7, 0))
    assert r.status_code == 201
    assert r.json()["avviso"] is None

    # Notte del salto di primavera, 28 -> 29 marzo: 420 reali < 450.
    r = _presa(client, token, fid, date(2026, 3, 28), 2, dtime(23, 0),
               ricalcolo=_ricalcolo(date(2026, 3, 29), 1, dtime(7, 0)))
    assert r.status_code == 201
    assert r.json()["ricalcolo"] == "rifiutato_intervallo_minimo"
    r = _presa(client, token, fid, date(2026, 3, 29), 1, dtime(7, 0))
    assert r.status_code == 201
    assert r.json()["avviso"] == {
        "codice": "PRESA_SOTTO_INTERVALLO_MINIMO",
        "lato": "precedente",
        "minuti_dalla_vicina": 420,
        "intervallo_minimo_minuti": 450,
        "ora_effettiva_vicina": "2026-03-28T23:00:00",
    }

    # Notte del ritorno, 24 -> 25 ottobre: 540 reali >= 450.
    r = _presa(client, token, fid, date(2026, 10, 24), 2, dtime(23, 0),
               ricalcolo=_ricalcolo(date(2026, 10, 25), 1, dtime(7, 0)))
    assert r.json()["ricalcolo"] == "applicato"
    r = _presa(client, token, fid, date(2026, 10, 25), 1, dtime(7, 0))
    assert r.json()["avviso"] is None


# ---------------------------------------------------------------- dedup


def test_dedup_riporta_lo_avviso(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Una risposta persa non perde lo avviso: la ritrasmissione con la stessa
    targa risponde 200 dedup e lo avviso ricalcolato dalle righe."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id)
    assert _presa(client, token, fid, D, 1, dtime(9, 0)).status_code == 201
    targa = str(uuid.uuid4())
    prima = _presa(client, token, fid, D, 2, dtime(10, 0), targa=targa)
    assert prima.status_code == 201
    assert prima.json()["avviso"]["minuti_dalla_vicina"] == 60
    replay = _presa(client, token, fid, D, 2, dtime(10, 0), targa=targa)
    assert replay.status_code == 200
    assert replay.json()["dedup"] is True
    assert replay.json()["avviso"] == prima.json()["avviso"]
    assert replay.json()["ricalcolo"] is None
    assert len(_righe(client, token, fid, D, D)) == 2
