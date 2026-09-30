"""
Pins of the planner (pharmatimer_api/pianificatore.py) -- Web Push channel,
branch A. Decisions 8, 9, 11, 12, 15, 16 and 22 of STATO_CORRENTE.md; D2 A
(2026-10-01); conditions 1 and 2 of Roberto and the activation boundary
(2026-09-30).

The planner runs on the test DB with its clock and its sender injected: the
clock is a fixed epoch, the sender a fake that records every POST and answers
as scripted. The condition 2 tests use the real transport instead, with a
fake network session: the "mittente finto" of the condition is the session.

Every pin has its row in scripts/audit/mutazioni.py, in both directions
where the gate has two. Pin 3 of decision 22 (an open row outside the
calendar gives no send) holds by construction: the planner starts from the
calendar and never from the log. It is pinned here and declared in the bench.
"""
import json
from types import SimpleNamespace

import pytest
import requests
from urllib3.exceptions import MaxRetryError, NewConnectionError

from pharmatimer_api import invio, pianificatore

from .aiuti_push import (
    ADESSO,
    MINUTO,
    SUB,
    crea_iscrizione,
    esegui,
    iscrizione,
    metti_log,
    metti_pubblicazione,
    metti_voce,
    righe,
)

GIORNO = 24 * 60 * MINUTO
OGGI = "2026-10-01"
E1 = "https://web.push.apple.com/QmUno"
E2 = "https://web.push.apple.com/QmDue"

ACCETTATO = invio.Esito("accettato", None, 201, None)
RIFIUTO_503 = invio.Esito("da_ritentare", "http_503", 503, None)
MORTA = invio.Esito("respinto", "iscrizione_morta", 410, None, iscrizione_morta=True)

FIRMA = invio.Firma(vapid=object(), sub=SUB, motivo=None)
SENZA_CHIAVE = invio.Firma(vapid=None, sub=None, motivo="pem_illeggibile")


class Mittente:
    """In place of invio.invia: records every POST, answers as scripted."""

    def __init__(self, *esiti: invio.Esito) -> None:
        self.esiti = list(esiti) or [ACCETTATO]
        self.chiamate: list[dict] = []

    def __call__(self, iscr, dati, ttl_s, vapid, sub) -> invio.Esito:
        self.chiamate.append({"endpoint": iscr["endpoint"], "dati": json.loads(dati), "ttl_s": ttl_s})
        return self.esiti.pop(0) if len(self.esiti) > 1 else self.esiti[0]


def _passata(pool, firma=FIRMA, mittente=None, ora=ADESSO, invia=None):
    """One pass on a fresh connection. ora: an epoch, or a list consumed call by call."""
    mittente = mittente if mittente is not None else Mittente()
    if isinstance(ora, list):
        sequenza = iter(ora)
        ultimo = [ora[0]]

        def orologio():
            ultimo[0] = next(sequenza, ultimo[0])
            return ultimo[0]
    else:

        def orologio():
            return ora

    conn = pool.get_connection()
    try:
        pianificatore.passata(conn, firma, invia=invia or mittente, orologio=orologio)
    finally:
        conn.close()
    return mittente


def _invii(pool) -> list[dict]:
    return righe(
        pool,
        "SELECT dose_numero, forma, stato, motivo, letto_stato, ttl_s, istante_ms, http_status "
        "FROM push_dispatch ORDER BY dose_numero, id",
    )


def _dispatch(pool, dose_numero: int = 1) -> dict:
    (riga,) = [r for r in _invii(pool) if r["dose_numero"] == dose_numero]
    return riga


@pytest.fixture
def scena(db_test_pool, insert_test_user, insert_test_farmaco):
    """A patient with one farmaco and one phone, activated a day before the clock."""
    _, u = insert_test_user(nome="Paziente")
    f = insert_test_farmaco(utente_id=u, nome="Medrol")
    sub = crea_iscrizione(db_test_pool, u, E1, ADESSO - GIORNO)
    return SimpleNamespace(pool=db_test_pool, u=u, f=f, sub=sub)


# ------------------------------------------------------------ window, decision 16


def test_voce_futura_non_parte(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO + 1_000)
    mittente = _passata(scena.pool)
    assert mittente.chiamate == []
    assert _invii(scena.pool) == []


def test_voce_dovuta_parte_con_ttl_del_resto_della_finestra(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - 5 * MINUTO)
    mittente = _passata(scena.pool)
    assert mittente.chiamate == [
        {
            "endpoint": E1,
            "ttl_s": 15 * 60,
            "dati": {
                "v": 1,
                "tipo": "dose",
                "titolo": "Medrol",
                "corpo": "Dopo colazione",
                "istante_ms": ADESSO - 5 * MINUTO,
                "farmaco_id": scena.f,
                "data": OGGI,
                "dose_numero": 1,
            },
        }
    ]
    riga = righe(
        scena.pool,
        "SELECT forma, stato, motivo, ttl_s, http_status, deciso_ms, inviato_ms, letto_stato "
        "FROM push_dispatch",
    )
    assert riga == [
        {
            "forma": "dose",
            "stato": "accettato",
            "motivo": None,
            "ttl_s": 900,
            "http_status": 201,
            "deciso_ms": ADESSO,
            "inviato_ms": ADESSO,
            "letto_stato": None,
        }
    ]


def test_finestra_al_confine(scena) -> None:
    # Decision 16: [istante, istante + 20 min); the TTL is what is left at the POST.
    inizio = ADESSO - 20 * MINUTO
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, inizio)
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 2, inizio + 999)
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 3, inizio + 1_000)
    mittente = _passata(scena.pool)
    assert [c["ttl_s"] for c in mittente.chiamate] == [1]
    assert [(r["dose_numero"], r["stato"], r["motivo"]) for r in _invii(scena.pool)] == [
        (1, "non_inviato", "scaduto"),
        (2, "non_inviato", "scaduto"),
        (3, "accettato", None),
    ]


def test_ttl_calcolato_all_invio(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - 5 * MINUTO)
    mittente = _passata(scena.pool, ora=[ADESSO, ADESSO + 30_000])
    assert [c["ttl_s"] for c in mittente.chiamate] == [15 * 60 - 30]


# ------------------------------------------------------------ log, decision 8


@pytest.mark.parametrize("stato", ["presa", "saltata", "sospesa"])
def test_log_chiuso_non_invia(scena, stato) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    metti_log(scena.pool, scena.u, scena.f, OGGI, 1, stato)
    mittente = _passata(scena.pool)
    assert mittente.chiamate == []
    riga = _dispatch(scena.pool)
    assert (riga["stato"], riga["motivo"], riga["letto_stato"]) == ("non_inviato", stato, stato)


@pytest.mark.parametrize("riga_log", [None, "prevista"])
def test_senza_riga_o_prevista_invia(scena, riga_log) -> None:
    # Fail-safe: no row is a dose due; a 'prevista' row (after an undo) too.
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    if riga_log:
        metti_log(scena.pool, scena.u, scena.f, OGGI, 1, riga_log)
    mittente = _passata(scena.pool)
    assert len(mittente.chiamate) == 1
    assert (_dispatch(scena.pool)["forma"], _dispatch(scena.pool)["stato"]) == ("dose", "accettato")


# ------------------------------------------------------------ decisions 11 and 22


def test_ricalcolata_uguale_da_push_di_dose(scena) -> None:
    # Decision 22, pin 2: the log equal to the publication gives the dose push.
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO, ora_ricalcolata="2026-10-01 09:59:00")
    metti_log(scena.pool, scena.u, scena.f, OGGI, 1, "ricalcolata", "2026-10-01 09:59:00")
    mittente = _passata(scena.pool)
    assert [c["dati"]["tipo"] for c in mittente.chiamate] == ["dose"]
    assert _dispatch(scena.pool)["forma"] == "dose"


def test_ricalcolata_non_pubblicata_da_avviso_neutro(scena) -> None:
    # Decision 22, pin 1: a ricalcolata in the log that the publication does
    # not carry gives a neutral notice, with no farmaco and no time.
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    metti_log(scena.pool, scena.u, scena.f, OGGI, 1, "ricalcolata", "2026-10-01 11:30:00")
    mittente = _passata(scena.pool)
    (chiamata,) = mittente.chiamate
    assert chiamata["dati"]["tipo"] == "avviso_neutro"
    assert set(chiamata["dati"]) == {"v", "tipo", "titolo", "corpo"}
    riga = _dispatch(scena.pool)
    assert (riga["forma"], riga["stato"], riga["motivo"]) == ("avviso_neutro", "accettato", "divergenza")


def test_ricalcolata_diversa_da_avviso_neutro(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO, ora_ricalcolata="2026-10-01 09:59:00")
    metti_log(scena.pool, scena.u, scena.f, OGGI, 1, "ricalcolata", "2026-10-01 10:30:00")
    _passata(scena.pool)
    assert (_dispatch(scena.pool)["forma"], _dispatch(scena.pool)["motivo"]) == (
        "avviso_neutro",
        "divergenza",
    )


def test_riga_aperta_fuori_calendario_non_da_invii(scena) -> None:
    # Decision 22, pin 3: by construction, the planner never starts from the log.
    metti_log(scena.pool, scena.u, scena.f, OGGI, 2, "ricalcolata", "2026-10-01 09:00:00")
    metti_log(scena.pool, scena.u, scena.f, OGGI, 3, "prevista")
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO + 60 * MINUTO)
    mittente = _passata(scena.pool)
    assert mittente.chiamate == []
    assert _invii(scena.pool) == []


def test_dopo_avviso_neutro_nessun_push_di_dose(scena) -> None:
    # The limit of decision 11: after a neutral notice, never the dose push,
    # not even after the republication that realigns the two.
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    metti_log(scena.pool, scena.u, scena.f, OGGI, 1, "ricalcolata", "2026-10-01 11:30:00")
    _passata(scena.pool)
    esegui(
        scena.pool,
        "UPDATE push_calendario SET ora_ricalcolata = '2026-10-01 11:30:00' WHERE utente_id = %s",
        (scena.u,),
    )
    mittente = _passata(scena.pool, ora=ADESSO + MINUTO)
    assert mittente.chiamate == []


# ------------------------------------------------------------ D2 A


def test_farmaco_non_attivo_non_invia(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    esegui(scena.pool, "UPDATE farmaci SET attivo = FALSE WHERE id = %s", (scena.f,))
    mittente = _passata(scena.pool)
    assert mittente.chiamate == []
    assert (_dispatch(scena.pool)["stato"], _dispatch(scena.pool)["motivo"]) == (
        "non_inviato",
        "farmaco_non_attivo",
    )


def test_utente_non_attivo_non_invia(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    esegui(scena.pool, "UPDATE utenti SET attivo = FALSE WHERE id = %s", (scena.u,))
    mittente = _passata(scena.pool)
    assert mittente.chiamate == []
    assert (_dispatch(scena.pool)["stato"], _dispatch(scena.pool)["motivo"]) == (
        "non_inviato",
        "utente_non_attivo",
    )


# ------------------------------------------------------------ at most once


def test_due_passate_un_solo_invio(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    mittente = Mittente()
    _passata(scena.pool, mittente=mittente)
    _passata(scena.pool, mittente=mittente, ora=ADESSO + MINUTO)
    assert len(mittente.chiamate) == 1


def test_decisione_gia_presa_non_riparte(scena) -> None:
    # A decision written by another pass whose POST is still in flight.
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    esegui(
        scena.pool,
        "INSERT INTO push_dispatch (subscription_id, utente_id, farmaco_id, data, dose_numero, "
        "istante_ms, stato, deciso_ms) VALUES (%s, %s, %s, %s, 1, %s, 'in_invio', %s)",
        (scena.sub, scena.u, scena.f, OGGI, ADESSO - MINUTO, ADESSO),
    )
    mittente = _passata(scena.pool)
    assert mittente.chiamate == []


def test_riga_non_piu_da_ritentare_non_riparte(scena) -> None:
    # The conditional retry: a row read as da_ritentare that another pass has
    # accepted in the meantime is not sent again.
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    _passata(scena.pool, mittente=Mittente(RIFIUTO_503))
    conn = scena.pool.get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(pianificatore._DOSI_DOVUTE, {"adesso": ADESSO, "tolleranza": 20 * MINUTO})
        (voce,) = cur.fetchall()
        conn.commit()
        esegui(scena.pool, "UPDATE push_dispatch SET stato = 'accettato'")
        mittente = Mittente()
        esito = pianificatore._tenta_dose(conn, cur, voce, FIRMA, mittente, lambda: ADESSO)
        cur.close()
    finally:
        conn.close()
    assert esito == "cambiata"
    assert mittente.chiamate == []


def test_voce_cambiata_fra_lettura_e_decisione_non_parte(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    conn = scena.pool.get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(pianificatore._DOSI_DOVUTE, {"adesso": ADESSO, "tolleranza": 20 * MINUTO})
        (voce,) = cur.fetchall()
        conn.commit()
        # The phone republishes between the read and the decision.
        esegui(scena.pool, "UPDATE push_calendario SET istante_ms = %s", (ADESSO + 30 * MINUTO,))
        mittente = Mittente()
        esito = pianificatore._tenta_dose(conn, cur, voce, FIRMA, mittente, lambda: ADESSO)
        cur.close()
    finally:
        conn.close()
    assert esito == "cambiata"
    assert mittente.chiamate == []
    assert _invii(scena.pool) == []


# ------------------------------------------------------------ condition 1


def test_ritentativo_rifa_i_controlli_e_non_parte_dopo_una_presa(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    _passata(scena.pool, mittente=Mittente(RIFIUTO_503))
    assert (_dispatch(scena.pool)["stato"], _dispatch(scena.pool)["motivo"]) == (
        "da_ritentare",
        "http_503",
    )
    metti_log(scena.pool, scena.u, scena.f, OGGI, 1, "presa")
    mittente = _passata(scena.pool, ora=ADESSO + MINUTO)
    assert mittente.chiamate == []
    riga = _dispatch(scena.pool)
    assert (riga["stato"], riga["motivo"], riga["letto_stato"]) == ("non_inviato", "presa", "presa")


def test_ritentativo_senza_presa_parte(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    _passata(scena.pool, mittente=Mittente(RIFIUTO_503))
    mittente = _passata(scena.pool, ora=ADESSO + MINUTO)
    assert [c["ttl_s"] for c in mittente.chiamate] == [18 * 60]
    assert _dispatch(scena.pool)["stato"] == "accettato"


def test_ritentativo_segue_la_voce_spostata(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    _passata(scena.pool, mittente=Mittente(RIFIUTO_503))
    nuovo = ADESSO + 10 * MINUTO
    esegui(scena.pool, "UPDATE push_calendario SET istante_ms = %s", (nuovo,))
    assert _passata(scena.pool, ora=ADESSO + MINUTO).chiamate == []
    mittente = _passata(scena.pool, ora=nuovo + MINUTO)
    assert [c["dati"]["istante_ms"] for c in mittente.chiamate] == [nuovo]
    assert (_dispatch(scena.pool)["stato"], _dispatch(scena.pool)["istante_ms"]) == ("accettato", nuovo)


def test_voce_ritirata_chiude_il_ritentativo(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    _passata(scena.pool, mittente=Mittente(RIFIUTO_503))
    esegui(scena.pool, "DELETE FROM push_calendario")
    mittente = _passata(scena.pool, ora=ADESSO + MINUTO)
    assert mittente.chiamate == []
    assert (_dispatch(scena.pool)["stato"], _dispatch(scena.pool)["motivo"]) == (
        "non_inviato",
        "voce_ritirata",
    )


# ------------------------------------------------------------ condition 2, end to end


@pytest.fixture
def trasporto(scena, pem_vapid):
    """The real transport, a real key, a real subscription: only the network is fake."""
    esegui(scena.pool, "DELETE FROM push_subscriptions")
    chiavi = iscrizione(E2, "00000000-0000-4000-8000-000000000000")["keys"]
    crea_iscrizione(scena.pool, scena.u, E2, ADESSO - GIORNO, chiavi=chiavi)
    pem, _ = pem_vapid
    firma = invio.prepara_firma(pem, SUB)
    assert firma.motivo is None
    return firma


class SessioneFinta:
    def __init__(self, esito) -> None:
        self.esito = esito
        self.post_ricevute = 0

    def __call__(self):
        return self

    def post(self, url, **kwargs):
        self.post_ricevute += 1
        if isinstance(self.esito, BaseException):
            raise self.esito
        return self.esito

    def close(self) -> None:
        pass


def _con_rete(sessione):
    def invia(iscr, dati, ttl_s, vapid, sub):
        return invio.invia(iscr, dati, ttl_s, vapid, sub, fabbrica=sessione)

    return invia


def test_connection_error_generica_da_esito_ignoto_e_nessun_secondo_tentativo(
    scena, trasporto
) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    rete = SessioneFinta(requests.exceptions.ConnectionError("Connection aborted."))
    _passata(scena.pool, firma=trasporto, invia=_con_rete(rete))
    riga = _dispatch(scena.pool)
    assert (riga["stato"], riga["motivo"]) == ("in_invio", "esito_ignoto")
    _passata(scena.pool, firma=trasporto, invia=_con_rete(rete), ora=ADESSO + MINUTO)
    assert rete.post_ricevute == 1


def test_passata_ritenta_la_connessione_mai_stabilita(scena, trasporto) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    rifiutata = requests.exceptions.ConnectionError(
        MaxRetryError(None, E2, reason=NewConnectionError(None, "Connection refused"))
    )
    rete = SessioneFinta(rifiutata)
    _passata(scena.pool, firma=trasporto, invia=_con_rete(rete))
    assert _dispatch(scena.pool)["stato"] == "da_ritentare"
    _passata(scena.pool, firma=trasporto, invia=_con_rete(rete), ora=ADESSO + MINUTO)
    assert rete.post_ricevute == 2


# ------------------------------------------------------------ activation boundary


def test_finestra_chiusa_prima_dell_attivazione_non_da_scaduto(scena) -> None:
    esegui(scena.pool, "DELETE FROM push_subscriptions")
    crea_iscrizione(scena.pool, scena.u, E2, ADESSO - 60 * MINUTO)
    # Window [-90, -70) min: closed before the activation at -60.
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - 90 * MINUTO)
    mittente = _passata(scena.pool)
    assert mittente.chiamate == []
    assert _invii(scena.pool) == []


def test_finestra_chiusa_dopo_l_attivazione_da_scaduto(scena) -> None:
    esegui(scena.pool, "DELETE FROM push_subscriptions")
    crea_iscrizione(scena.pool, scena.u, E2, ADESSO - 60 * MINUTO)
    # Window [-50, -30) min: closed after the activation at -60, before now.
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - 50 * MINUTO)
    mittente = _passata(scena.pool)
    assert mittente.chiamate == []
    assert [(r["stato"], r["motivo"]) for r in _invii(scena.pool)] == [("non_inviato", "scaduto")]


# ------------------------------------------------------------ key, decision 15


def test_chiave_assente_ritenta_dentro_la_finestra(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    mittente = _passata(scena.pool, firma=SENZA_CHIAVE)
    assert mittente.chiamate == []
    assert (_dispatch(scena.pool)["stato"], _dispatch(scena.pool)["motivo"]) == (
        "da_ritentare",
        "chiave_assente",
    )
    assert righe(scena.pool, "SELECT esito, dettaglio FROM push_pianificatore") == [
        {"esito": "chiave_assente", "dettaglio": "pem_illeggibile"}
    ]
    mittente = _passata(scena.pool, ora=ADESSO + MINUTO)
    assert len(mittente.chiamate) == 1
    assert _dispatch(scena.pool)["stato"] == "accettato"


def test_chiave_assente_oltre_la_finestra_scade(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    _passata(scena.pool, firma=SENZA_CHIAVE)
    mittente = _passata(scena.pool, ora=ADESSO + 30 * MINUTO)
    assert mittente.chiamate == []
    assert (_dispatch(scena.pool)["stato"], _dispatch(scena.pool)["motivo"]) == (
        "non_inviato",
        "scaduto",
    )


# ------------------------------------------------------------ 404 and 410


def test_iscrizione_morta_si_spegne(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    _passata(scena.pool, mittente=Mittente(MORTA))
    assert (_dispatch(scena.pool)["stato"], _dispatch(scena.pool)["motivo"]) == (
        "respinto",
        "iscrizione_morta",
    )
    assert righe(
        scena.pool, "SELECT attiva, disattivata_ms, motivo_disattivazione FROM push_subscriptions"
    ) == [{"attiva": 0, "disattivata_ms": ADESSO, "motivo_disattivazione": "iscrizione_morta"}]


# ------------------------------------------------------------ end of horizon, decision 12


def _avvisi(pool) -> list[dict]:
    return righe(pool, "SELECT avviso_fine_ms, entro_ms, stato, motivo, ttl_s FROM push_avvisi_fine")


def test_avviso_fine_parte_nella_sua_finestra(scena) -> None:
    metti_pubblicazione(scena.pool, scena.u, ADESSO - MINUTO, ADESSO + 30 * MINUTO)
    mittente = _passata(scena.pool)
    (chiamata,) = mittente.chiamate
    assert chiamata["ttl_s"] == 30 * 60
    assert chiamata["dati"]["tipo"] == "avviso_fine"
    assert set(chiamata["dati"]) == {"v", "tipo", "titolo", "corpo"}
    assert [(a["stato"], a["ttl_s"]) for a in _avvisi(scena.pool)] == [("accettato", 1800)]


def test_avviso_fine_non_parte_prima(scena) -> None:
    metti_pubblicazione(scena.pool, scena.u, ADESSO + 1_000, ADESSO + 30 * MINUTO)
    assert _passata(scena.pool).chiamate == []
    assert _avvisi(scena.pool) == []


def test_avviso_fine_oltre_entro_scade(scena) -> None:
    metti_pubblicazione(scena.pool, scena.u, ADESSO - 60 * MINUTO, ADESSO)
    assert _passata(scena.pool).chiamate == []
    assert [(a["stato"], a["motivo"]) for a in _avvisi(scena.pool)] == [("non_inviato", "scaduto")]


def test_avviso_fine_superato_da_una_pubblicazione_piu_recente(scena) -> None:
    metti_pubblicazione(scena.pool, scena.u, ADESSO - MINUTO, ADESSO + 30 * MINUTO)
    _passata(scena.pool, firma=SENZA_CHIAVE)
    assert [(a["stato"], a["motivo"]) for a in _avvisi(scena.pool)] == [
        ("da_ritentare", "chiave_assente")
    ]
    # A newer publication moves the notice: the old one never leaves.
    metti_pubblicazione(scena.pool, scena.u, ADESSO + 24 * 60 * MINUTO, ADESSO + 25 * 60 * MINUTO)
    mittente = _passata(scena.pool, ora=ADESSO + MINUTO)
    assert mittente.chiamate == []
    assert [(a["stato"], a["motivo"]) for a in _avvisi(scena.pool)] == [("non_inviato", "superato")]


def test_avviso_fine_utente_non_attivo(scena) -> None:
    metti_pubblicazione(scena.pool, scena.u, ADESSO - MINUTO, ADESSO + 30 * MINUTO)
    esegui(scena.pool, "UPDATE utenti SET attivo = FALSE WHERE id = %s", (scena.u,))
    assert _passata(scena.pool).chiamate == []
    assert [(a["stato"], a["motivo"]) for a in _avvisi(scena.pool)] == [
        ("non_inviato", "utente_non_attivo")
    ]


# ------------------------------------------------------------ I2 and the heartbeat


def test_la_passata_non_scrive_il_log(scena) -> None:
    metti_log(scena.pool, scena.u, scena.f, OGGI, 1, "presa")
    metti_log(scena.pool, scena.u, scena.f, OGGI, 2, "ricalcolata", "2026-10-01 11:30:00")
    metti_log(scena.pool, scena.u, scena.f, OGGI, 3, "prevista")
    for dose in range(1, 6):
        metti_voce(scena.pool, scena.u, scena.f, OGGI, dose, ADESSO - dose * MINUTO)
    metti_pubblicazione(scena.pool, scena.u, ADESSO - MINUTO, ADESSO + 30 * MINUTO)
    prima = righe(scena.pool, "SELECT * FROM log_assunzioni ORDER BY id")
    _passata(scena.pool)
    _passata(scena.pool, firma=SENZA_CHIAVE, ora=ADESSO + MINUTO)
    assert righe(scena.pool, "SELECT * FROM log_assunzioni ORDER BY id") == prima


def test_battito_a_ogni_passata(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    _passata(scena.pool, ora=[ADESSO, ADESSO + 2_000])
    assert righe(scena.pool, "SELECT nome, ultima_passata_ms, esito, dettaglio FROM push_pianificatore") == [
        {"nome": "pianificatore", "ultima_passata_ms": ADESSO + 2_000, "esito": "ok", "dettaglio": "accettato 1"}
    ]
    _passata(scena.pool, firma=SENZA_CHIAVE, ora=ADESSO + MINUTO)
    assert righe(scena.pool, "SELECT ultima_passata_ms, esito, dettaglio FROM push_pianificatore") == [
        {"ultima_passata_ms": ADESSO + MINUTO, "esito": "chiave_assente", "dettaglio": "pem_illeggibile"}
    ]


def test_main_una_passata_e_il_battito(scena, monkeypatch) -> None:
    monkeypatch.setattr(pianificatore.connection, "apri_connessione", scena.pool.get_connection)
    monkeypatch.setattr(pianificatore.invio, "prepara_firma", lambda pem, sub: SENZA_CHIAVE)
    monkeypatch.setattr(pianificatore.canale, "adesso_ms", lambda: ADESSO)
    assert pianificatore.main() == 0
    assert righe(scena.pool, "SELECT esito, dettaglio FROM push_pianificatore") == [
        {"esito": "chiave_assente", "dettaglio": "pem_illeggibile"}
    ]


def test_main_dice_l_errore_nel_battito(scena, monkeypatch) -> None:
    def rotta(conn, firma, **_):
        raise RuntimeError("guasto di prova")

    monkeypatch.setattr(pianificatore.connection, "apri_connessione", scena.pool.get_connection)
    monkeypatch.setattr(pianificatore.invio, "prepara_firma", lambda pem, sub: FIRMA)
    monkeypatch.setattr(pianificatore, "passata", rotta)
    monkeypatch.setattr(pianificatore.canale, "adesso_ms", lambda: ADESSO)
    assert pianificatore.main() == 1
    assert righe(scena.pool, "SELECT ultima_passata_ms, esito, dettaglio FROM push_pianificatore") == [
        {"ultima_passata_ms": ADESSO, "esito": "errore", "dettaglio": "RuntimeError: guasto di prova"}
    ]


# ------------------------------------------------------------ closures, I3


def test_in_invio_orfano_diventa_esito_ignoto_e_non_riparte(scena) -> None:
    # A pass interrupted between the decision and the outcome: the POST may
    # have left, so the row stays in_invio, says esito_ignoto, never retried.
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - 5 * MINUTO)
    esegui(
        scena.pool,
        "INSERT INTO push_dispatch (subscription_id, utente_id, farmaco_id, data, dose_numero, "
        "istante_ms, forma, stato, deciso_ms) VALUES (%s, %s, %s, %s, 1, %s, 'dose', 'in_invio', %s)",
        (scena.sub, scena.u, scena.f, OGGI, ADESSO - 5 * MINUTO, ADESSO - 3 * MINUTO),
    )
    mittente = _passata(scena.pool)
    assert mittente.chiamate == []
    assert (_dispatch(scena.pool)["stato"], _dispatch(scena.pool)["motivo"]) == (
        "in_invio",
        "esito_ignoto",
    )


def test_ritentativo_su_iscrizione_spenta_si_chiude(scena) -> None:
    metti_voce(scena.pool, scena.u, scena.f, OGGI, 1, ADESSO - MINUTO)
    _passata(scena.pool, mittente=Mittente(RIFIUTO_503))
    esegui(scena.pool, "UPDATE push_subscriptions SET attiva = FALSE")
    mittente = _passata(scena.pool, ora=ADESSO + MINUTO)
    assert mittente.chiamate == []
    assert (_dispatch(scena.pool)["stato"], _dispatch(scena.pool)["motivo"]) == (
        "non_inviato",
        "iscrizione_spenta",
    )
