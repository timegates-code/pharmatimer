"""
Pins of pharmatimer_api.invio -- the transport, and condition 2 of Roberto
(2026-09-30): attempt again only on what certifies that the push service did
not accept, by white list; everything else not certified is esito_ignoto.

The network is a fake session in place of requests.Session; responses are
real requests.Response objects; encryption and VAPID signature run for real,
on a real P-256 key and a real subscription key pair.

Every pin has its row in scripts/audit/mutazioni.py, in both directions:
- a generic ConnectionError, a read timeout, an SSL error: esito_ignoto;
  a connect timeout, a refused connection: attempted again;
- 502 and 504 (a gateway) and 500: esito_ignoto; 408, 429, 503: again;
- 201 and 202 only are accettato; 200, 204 and 3xx certify nothing;
- 404 and 410 switch the subscription off; other 4xx are final refusals;
- a failure before the POST left is a refusal, not an unknown outcome;
- the POST carries the split timeout, no redirects, TTL and Urgency, no Topic.
"""
import json
from http.client import RemoteDisconnected

import pytest
import requests
from cryptography.hazmat.primitives.asymmetric import ec
from py_vapid import Vapid
from requests.structures import CaseInsensitiveDict
from urllib3.exceptions import MaxRetryError, NameResolutionError, NewConnectionError, ProtocolError

from pharmatimer_api import invio

from .aiuti_push import SUB, b64url, iscrizione

ENDPOINT = "https://web.push.apple.com/QmSonda"


class SessioneFinta:
    """In place of requests.Session: records every POST, answers as scripted."""

    def __init__(self, risposta) -> None:
        self.risposta = risposta
        self.chiamate: list[tuple[str, dict]] = []
        self.chiusa = False

    def post(self, url, **kwargs):
        self.chiamate.append((url, kwargs))
        if isinstance(self.risposta, BaseException):
            raise self.risposta
        return self.risposta

    def close(self) -> None:
        self.chiusa = True


def risposta(status: int, corpo: bytes = b"") -> requests.Response:
    r = requests.Response()
    r.status_code = status
    r._content = corpo
    r.reason = "sonda"
    r.url = ENDPOINT
    r.headers = CaseInsensitiveDict({})
    return r


def _sub(p256dh: str | None = None) -> dict:
    corpo = iscrizione(ENDPOINT, "00000000-0000-4000-8000-000000000000")
    chiavi = dict(corpo["keys"])
    if p256dh is not None:
        chiavi["p256dh"] = p256dh
    return {"endpoint": ENDPOINT, "keys": chiavi}


def _vapid() -> Vapid:
    return Vapid(private_key=ec.generate_private_key(ec.SECP256R1()))


def _invia(esito, sub: dict | None = None) -> tuple[invio.Esito, SessioneFinta]:
    sessione = SessioneFinta(esito)
    risultato = invio.invia(
        sub or _sub(),
        json.dumps({"v": 1, "tipo": "dose"}),
        123,
        _vapid(),
        SUB,
        fabbrica=lambda: sessione,
    )
    return risultato, sessione


def test_201_e_202_sono_accettati() -> None:
    for status in (201, 202):
        esito, sessione = _invia(risposta(status))
        assert (esito.stato, esito.motivo, esito.http_status) == ("accettato", None, status)
        assert len(sessione.chiamate) == 1


def test_200_204_e_3xx_non_certificano_nulla() -> None:
    for status in (200, 204, 301, 307):
        esito, _ = _invia(risposta(status))
        assert (esito.stato, esito.motivo, esito.http_status) == ("in_invio", "esito_ignoto", status)


def test_408_429_503_certificano_il_rifiuto_e_si_ritentano() -> None:
    for status in (408, 429, 503):
        esito, _ = _invia(risposta(status))
        assert (esito.stato, esito.motivo, esito.http_status) == (
            "da_ritentare",
            f"http_{status}",
            status,
        )


def test_500_502_504_non_certificano_e_non_si_ritentano() -> None:
    for status in (500, 502, 504, 507):
        esito, _ = _invia(risposta(status))
        assert (esito.stato, esito.motivo, esito.http_status) == ("in_invio", "esito_ignoto", status)


def test_4xx_sono_rifiuti_definitivi_e_404_410_spengono() -> None:
    esito, _ = _invia(risposta(403, b'{"reason":"VapidPkHashMismatch"}'))
    assert (esito.stato, esito.motivo, esito.iscrizione_morta) == ("respinto", "http_403", False)
    assert "VapidPkHashMismatch" in esito.dettaglio
    for status in (400, 413, 501, 505):
        esito, _ = _invia(risposta(status))
        assert (esito.stato, esito.motivo, esito.iscrizione_morta) == (
            "respinto",
            f"http_{status}",
            False,
        )
    for status in (404, 410):
        esito, _ = _invia(risposta(status))
        assert (esito.stato, esito.motivo, esito.iscrizione_morta) == (
            "respinto",
            "iscrizione_morta",
            True,
        )


def test_connessione_mai_stabilita_si_ritenta() -> None:
    rifiutata = requests.exceptions.ConnectionError(
        MaxRetryError(None, ENDPOINT, reason=NewConnectionError(None, "Connection refused"))
    )
    dns = requests.exceptions.ConnectionError(
        MaxRetryError(None, ENDPOINT, reason=NameResolutionError("web.push.apple.com", None, "no"))
    )
    for eccezione in (requests.exceptions.ConnectTimeout("connect timed out"), rifiutata, dns):
        esito, sessione = _invia(eccezione)
        assert (esito.stato, esito.motivo) == ("da_ritentare", "connessione_mai_stabilita")
        assert len(sessione.chiamate) == 1


def test_connection_error_generica_e_esito_ignoto() -> None:
    # The measured case: the server read the request, then closed.
    abortita = requests.exceptions.ConnectionError(
        ProtocolError("Connection aborted.", RemoteDisconnected("Remote end closed connection"))
    )
    for eccezione in (
        abortita,
        requests.exceptions.ConnectionError("qualunque"),
        requests.exceptions.ReadTimeout("read timed out"),
        requests.exceptions.SSLError("handshake"),
        requests.exceptions.ChunkedEncodingError("corpo troncato"),
    ):
        esito, _ = _invia(eccezione)
        assert (esito.stato, esito.motivo, esito.http_status) == ("in_invio", "esito_ignoto", None)


def test_richiesta_mai_partita_e_un_rifiuto_non_un_esito_ignoto() -> None:
    # 65 bytes, 0x04 first, but not a point of the curve: encryption fails
    # before the POST, and the fake session never sees a call.
    non_sulla_curva = b64url(b"\x04" + b"\x01" * 64)
    esito, sessione = _invia(risposta(201), _sub(p256dh=non_sulla_curva))
    assert (esito.stato, esito.motivo) == ("respinto", "richiesta_non_partita")
    assert sessione.chiamate == []


def test_la_post_porta_timeout_diviso_niente_redirect_ttl_urgency_e_niente_topic() -> None:
    esito, sessione = _invia(risposta(201))
    assert esito.stato == "accettato"
    ((url, kwargs),) = sessione.chiamate
    assert url == ENDPOINT
    assert kwargs["timeout"] == (invio.TIMEOUT_CONNESSIONE_S, invio.TIMEOUT_LETTURA_S)
    assert kwargs["allow_redirects"] is False
    intestazioni = CaseInsensitiveDict(kwargs["headers"])
    assert intestazioni["ttl"] == "123"
    assert intestazioni["urgency"] == "high"
    assert intestazioni["content-encoding"] == "aes128gcm"
    assert intestazioni["authorization"].startswith("vapid t=")
    assert "topic" not in intestazioni
    assert sessione.chiusa is True


@pytest.mark.parametrize("ttl", [1, 1200])
def test_il_ttl_passa_com_e(ttl) -> None:
    sessione = SessioneFinta(risposta(201))
    invio.invia(_sub(), "{}", ttl, _vapid(), SUB, fabbrica=lambda: sessione)
    ((_, kwargs),) = sessione.chiamate
    assert CaseInsensitiveDict(kwargs["headers"])["ttl"] == str(ttl)


def test_prepara_firma_usa_la_regola_del_sub_della_libreria(pem_vapid, tmp_path) -> None:
    pem, _ = pem_vapid
    firma = invio.prepara_firma(pem, SUB)
    assert firma.motivo is None and isinstance(firma.vapid, Vapid) and firma.sub == SUB
    # The prefix passes canale's check; py_vapid's own pattern wants an address.
    assert invio.prepara_firma(pem, "mailto:senza-chiocciola") == invio.Firma(
        None, None, "sub_non_valido"
    )
    manca = tmp_path / "manca.pem"
    assert invio.prepara_firma(str(manca), SUB) == invio.Firma(None, None, "pem_illeggibile")
    assert not manca.exists()
    assert invio.prepara_firma(None, SUB) == invio.Firma(None, None, "pem_non_configurato")
