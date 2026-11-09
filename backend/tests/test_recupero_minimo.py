"""
PharmaTimer -- la guardia del minimo su /recupero: STATO, Coda di rimedio,
voce 1; decisioni del 2026-11-09, scelte 1A e 2A.

/recupero fissa l'orario di una dose ANCORA DA PRENDERE (stato 'ricalcolata')
e non registra mai una presa. La guardia rifiuta con 409 CONSTRAINT_VIOLATION,
come le altre guardie di /recupero sul dato, un recupero che porta la dose
SOTTO intervallo_minimo_ore dalla presa dello stesso farmaco piu vicina PRIMA
del nuovo orario, di qualunque dose e data, in minuti REALI
(tempo.minuti_reali, come la decisione 2). Il minimo esatto e ammesso: la Spec
4.6 dice "sotto". Senza minimo, o senza una presa prima, la guardia non agisce.
Giudica solo un gesto che sposta la dose PRIMA del suo orario attuale: un
totale piu basso, o il reset, la sposta piu tardi e passa come prima.

Ogni test dichiara nel nome i due esiti che distingue, rifiutato o accettato.
Il verso del rifiuto e quello che la guardia aggiunge; il verso
dell'accettazione e il comportamento di prima, che resta, ed e il bersaglio
del verso opposto nel banco delle mutazioni.

Date FISSE e non `date.today()`, come in test_intervallo_minimo.py: i giorni
delle transizioni sono un dato del dominio (29 marzo e 25 ottobre 2026), e lo
slot e UNIQUE per (data, dose).
"""
from __future__ import annotations

from collections.abc import Callable
from datetime import date, datetime
from datetime import time as dtime

from fastapi.testclient import TestClient

D = date(2026, 7, 15)


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


def _ricalcolo(data: date, dose: int, prevista: dtime, ricalcolata: datetime, gap: int) -> dict:
    return {
        "dose_numero": dose,
        "data": data.isoformat(),
        "ora_prevista": prevista.strftime("%H:%M:%S"),
        "ora_ricalcolata": ricalcolata.isoformat(),
        "gap_minuti": gap,
    }


def _presa(
    client: TestClient,
    token: str,
    fid: int,
    data: date,
    dose: int,
    prevista: dtime,
    effettiva: dtime,
    *,
    ricalcolo: dict | None = None,
) -> None:
    """La presa della dose, col ritardo come gap; il ricalcolo annidato della
    successiva, se c'e, deve risultare applicato."""
    ritardo = int(
        (datetime.combine(data, effettiva) - datetime.combine(data, prevista)).total_seconds() // 60
    )
    payload = {
        "data": data.isoformat(),
        "dose_numero": dose,
        "ora_prevista": prevista.strftime("%H:%M:%S"),
        "ora_effettiva": datetime.combine(data, effettiva).isoformat(),
        "delta_minuti": ritardo,
        "gap_minuti": ritardo,
        "recupero_minuti": 0,
    }
    if ricalcolo is not None:
        payload["ricalcolo_dose_successiva"] = ricalcolo
    r = client.post(f"/api/farmaci/{fid}/log/presa", json=payload, headers=_auth(token))
    assert r.status_code == 201, r.text
    if ricalcolo is not None:
        assert r.json()["ricalcolo"] == "applicato", r.text


def _recupero(client: TestClient, token: str, fid: int, data: date, dose: int, minuti: int):
    return client.post(
        f"/api/farmaci/{fid}/log/recupero",
        json={"data": data.isoformat(), "dose_numero": dose, "recupero_minuti": minuti},
        headers=_auth(token),
    )


def _righe(client: TestClient, token: str, fid: int, da: date, a: date) -> list[dict]:
    r = client.get(
        f"/api/farmaci/{fid}/log",
        params={"data_from": da.isoformat(), "data_to": a.isoformat()},
        headers=_auth(token),
    )
    assert r.status_code == 200
    return r.json()


def _foto(righe: list[dict]) -> list[tuple]:
    """Le colonne che una presa o un recupero muovono, riga per riga."""
    return [
        (
            x["dose_numero"],
            x["stato"],
            x["ora_effettiva"],
            x["ora_ricalcolata"],
            x["gap_minuti"],
            x["recupero_minuti"],
        )
        for x in righe
    ]


def _dose(client: TestClient, token: str, fid: int, data: date, dose: int) -> dict:
    return next(x for x in _righe(client, token, fid, data, data) if x["dose_numero"] == dose)


def _dose2_ricalcolata(client: TestClient, token: str, fid: int) -> None:
    """Dose 1 prevista alle 08:00 e presa alle 13:00; la dose 2, prevista alle
    16:00, ricalcolata alle 21:00 col gap di 300 minuti (Spec 4.2 e 4.5)."""
    _presa(
        client, token, fid, D, 1, dtime(8, 0), dtime(13, 0),
        ricalcolo=_ricalcolo(D, 2, dtime(16, 0), datetime(2026, 7, 15, 21, 0), 300),
    )


def _notte(client: TestClient, token: str, fid: int, sera: date, mattina: date) -> None:
    """Dose 3 prevista alle 19:00 della sera e presa alle 23:00; la dose 1 della
    mattina dopo, prevista alle 03:00, ricalcolata alle 07:00 col gap di 240:
    otto ore di parete dalla presa, ogni notte."""
    _presa(
        client, token, fid, sera, 3, dtime(19, 0), dtime(23, 0),
        ricalcolo=_ricalcolo(mattina, 1, dtime(3, 0), datetime.combine(mattina, dtime(7, 0)), 240),
    )


# ---------------------------------------------------------------- il minimo, due versi


def test_recupero_sotto_il_minimo_rifiutato_e_righe_intatte(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Recupero 300: la dose 2 cadrebbe alle 16:00, tre ore dopo la presa delle
    13:00, sotto il minimo di quattro. 409 CONSTRAINT_VIOLATION come le altre
    guardie sul dato, e nessuna riga cambia: ne la presa ne la dose 2."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id)
    _dose2_ricalcolata(client, token, fid)
    prima = _foto(_righe(client, token, fid, D, D))
    assert prima == [
        (1, "presa", "2026-07-15T13:00:00", None, 300, 0),
        (2, "ricalcolata", None, "2026-07-15T21:00:00", 300, 0),
    ]
    r = _recupero(client, token, fid, D, 2, 300)
    assert r.status_code == 409, r.text
    errore = r.json()["error"]
    assert errore["code"] == "CONSTRAINT_VIOLATION"
    assert "minimo" in errore["message"].lower()
    assert _foto(_righe(client, token, fid, D, D)) == prima


def test_recupero_un_minuto_sotto_il_confine_rifiutato(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Recupero 241: le 16:59, 239 minuti dalla presa. Rifiutato: il confine e
    al minuto."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id)
    _dose2_ricalcolata(client, token, fid)
    r = _recupero(client, token, fid, D, 2, 241)
    assert r.status_code == 409, r.text
    assert r.json()["error"]["code"] == "CONSTRAINT_VIOLATION"
    dose2 = _dose(client, token, fid, D, 2)
    assert (dose2["ora_ricalcolata"], dose2["recupero_minuti"]) == ("2026-07-15T21:00:00", 0)


def test_recupero_esattamente_al_minimo_accettato(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Recupero 240: le 17:00, 240 minuti dalla presa. La Spec 4.6 dice "sotto":
    il minimo esatto e ammesso, 200 come prima."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id)
    _dose2_ricalcolata(client, token, fid)
    r = _recupero(client, token, fid, D, 2, 240)
    assert r.status_code == 200, r.text
    assert r.json()["ora_ricalcolata"] == "2026-07-15T17:00:00"
    assert r.json()["recupero_minuti"] == 240


def test_recupero_sopra_il_minimo_accettato(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Recupero 180: le 18:00, cinque ore dalla presa. 200 come prima."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id)
    _dose2_ricalcolata(client, token, fid)
    r = _recupero(client, token, fid, D, 2, 180)
    assert r.status_code == 200, r.text
    assert r.json()["ora_ricalcolata"] == "2026-07-15T18:00:00"
    assert r.json()["recupero_minuti"] == 180


def test_recupero_senza_minimo_accettato(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """intervallo_minimo_ore NULL: la guardia non agisce, anche a tre ore dalla
    presa (decisione 3 del 2026-11-09; il default del 50% della Spec 3.1 resta
    la decisione 6 dello STATO). 200 come prima."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id, minimo=None)
    _dose2_ricalcolata(client, token, fid)
    r = _recupero(client, token, fid, D, 2, 300)
    assert r.status_code == 200, r.text
    assert r.json()["ora_ricalcolata"] == "2026-07-15T16:00:00"
    assert r.json()["recupero_minuti"] == 300


# ---------------------------------------------------------------- minuti REALI (DST)


def test_dst_primavera_sotto_il_minimo_reale_rifiutato(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Recupero 240 sulla dose delle 07:00 del 29 marzo: le 03:00, quattro ore
    di parete dalla presa delle 23:00 ma tre REALI, perche alle 02:00 del 29
    l'orologio salta alle 03:00. Minimo di quattro ore: 409. In minuti di
    parete sarebbe il confine, e passerebbe: lo slider del client lo lascia
    passare."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id)
    mattina = date(2026, 3, 29)
    _notte(client, token, fid, date(2026, 3, 28), mattina)
    r = _recupero(client, token, fid, mattina, 1, 240)
    assert r.status_code == 409, r.text
    assert r.json()["error"]["code"] == "CONSTRAINT_VIOLATION"
    dose1 = _dose(client, token, fid, mattina, 1)
    assert (dose1["ora_ricalcolata"], dose1["recupero_minuti"]) == ("2026-03-29T07:00:00", 0)


def test_dst_autunno_e_notte_ordinaria_accettati(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Notte ordinaria del 21-22 marzo, minimo di quattro ore: il recupero 240
    porta la dose alle 03:00, 240 minuti reali dalla presa, il confine: 200.
    Notte del 24-25 ottobre, minimo di quattro ore e mezza: le 03:00 sono 240
    minuti di parete dalle 23:00, sotto i 270, ma 300 REALI, perche alle 03:00
    del 25 l'orologio torna alle 02:00: 200. In minuti di parete sarebbe
    rifiutato."""
    token, owner_id = seed_owner_test

    fa = _farmaco(insert_test_farmaco, owner_id, minimo="4.0", nome="Marzo")
    _notte(client, token, fa, date(2026, 3, 21), date(2026, 3, 22))
    r = _recupero(client, token, fa, date(2026, 3, 22), 1, 240)
    assert r.status_code == 200, r.text
    assert r.json()["ora_ricalcolata"] == "2026-03-22T03:00:00"

    fo = _farmaco(insert_test_farmaco, owner_id, minimo="4.5", nome="Ottobre")
    _notte(client, token, fo, date(2026, 10, 24), date(2026, 10, 25))
    r = _recupero(client, token, fo, date(2026, 10, 25), 1, 240)
    assert r.status_code == 200, r.text
    assert r.json()["ora_ricalcolata"] == "2026-10-25T03:00:00"


# ---------------------------------------------------------------- da quale presa (1A)


def test_conta_la_presa_piu_vicina_prima_del_nuovo_orario(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
) -> None:
    """Due prese prima: la dose 1 alle 05:00 e la dose 2 alle 15:00, con cinque
    ore di ritardo; la dose 3 ricalcolata alle 23:00, gap 300. Il recupero 300
    la porta alle 18:00: tredici ore dalla dose 1 ma tre dalla 2. Conta la piu
    vicina: 409."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id)
    _presa(client, token, fid, D, 1, dtime(5, 0), dtime(5, 0))
    _presa(
        client, token, fid, D, 2, dtime(10, 0), dtime(15, 0),
        ricalcolo=_ricalcolo(D, 3, dtime(18, 0), datetime(2026, 7, 15, 23, 0), 300),
    )
    r = _recupero(client, token, fid, D, 3, 300)
    assert r.status_code == 409, r.text
    assert r.json()["error"]["code"] == "CONSTRAINT_VIOLATION"
    dose3 = _dose(client, token, fid, D, 3)
    assert (dose3["ora_ricalcolata"], dose3["recupero_minuti"]) == ("2026-07-15T23:00:00", 0)


# ---------------------------------------------------------------- i gesti che posticipano (2A)


def test_recupero_che_posticipa_accettato_quello_che_anticipa_rifiutato(
    client: TestClient,
    seed_owner_test: tuple[str, int],
    insert_test_farmaco: Callable[..., int],
    db_test_pool,
) -> None:
    """Il minimo arriva DOPO il recupero. Senza minimo la dose 2 e anticipata
    alle 16:00 (recupero 300), poi il farmaco prende il minimo di quattro ore.
    Un totale piu basso, 270, la sposta alle 16:30: ancora sotto il minimo, ma
    piu tardi di dov'era, e passa (200). Un totale piu alto, 280, la
    riporterebbe alle 16:20, prima: 409, e la dose resta alle 16:30. Giudicare
    anche il primo gesto lascerebbe la dose piu vicina alla presa di quanto la
    persona ha chiesto."""
    token, owner_id = seed_owner_test
    fid = _farmaco(insert_test_farmaco, owner_id, minimo=None)
    _dose2_ricalcolata(client, token, fid)
    assert _recupero(client, token, fid, D, 2, 300).status_code == 200

    conn = db_test_pool.get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE farmaci SET intervallo_minimo_ore = %s WHERE id = %s",
            ("4.0", fid),
        )
        assert cur.rowcount == 1
        conn.commit()
        cur.close()
    finally:
        conn.close()

    r = _recupero(client, token, fid, D, 2, 270)
    assert r.status_code == 200, r.text
    assert r.json()["ora_ricalcolata"] == "2026-07-15T16:30:00"

    r = _recupero(client, token, fid, D, 2, 280)
    assert r.status_code == 409, r.text
    assert r.json()["error"]["code"] == "CONSTRAINT_VIOLATION"
    dose2 = _dose(client, token, fid, D, 2)
    assert (dose2["ora_ricalcolata"], dose2["recupero_minuti"]) == ("2026-07-15T16:30:00", 270)
