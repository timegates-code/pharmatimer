"""
Pins of pharmatimer_api.canale -- Web Push reminder channel, branch A.
Decisions 15 and 16 of STATO_CORRENTE.md; Roberto's indication of 2026-09-30.

- The API never loads pywebpush nor aiohttp. A fresh interpreter imports the
  app and reads a real PEM through canale, the path GET /api/push/chiave
  takes; a control interpreter that imports pywebpush shows that the probe
  does see aiohttp when it is there. The two outcomes are distinct by
  construction, so the first test is a measure and not a decoration.
- A missing PEM stays missing: py_vapid's Vapid.from_file would generate a
  new key at that path, while decision 15 wants the channel off and saying so.
- The public key is the uncompressed P-256 point, base64url and unpadded.
- A configuration that cannot sign is named, never raised.

Every pin here has its row in scripts/audit/mutazioni.py.
"""
import base64
import json
import subprocess
import sys
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption, PrivateFormat

from pharmatimer_api import canale

BACKEND = Path(__file__).resolve().parents[1]
SUB = "mailto:sonda@example.org"

_SONDA = """
import json, sys
{prima}
import pharmatimer_api.app
from pharmatimer_api import canale
st = canale.stato_chiave({pem!r}, {sub!r})
print(json.dumps({{
    "canale": canale.__file__,
    "attivo": st.attivo,
    "pywebpush": "pywebpush" in sys.modules,
    "aiohttp": "aiohttp" in sys.modules,
}}))
"""


def _sonda(pem: str, prima: str = "") -> dict:
    """Run the probe in a fresh interpreter, in this tree's backend/."""
    codice = _SONDA.format(prima=prima, pem=pem, sub=SUB)
    p = subprocess.run(
        [sys.executable, "-c", codice], cwd=BACKEND, capture_output=True, text=True, timeout=120
    )
    assert p.returncode == 0, p.stderr
    esito = json.loads(p.stdout.strip().splitlines()[-1])
    # The probe must have imported THIS tree, or it measures another one.
    assert Path(esito["canale"]).resolve().is_relative_to(BACKEND), esito["canale"]
    return esito


def test_api_non_carica_pywebpush_ne_aiohttp(pem_vapid) -> None:
    pem, _ = pem_vapid
    esito = _sonda(pem)
    assert esito["attivo"] is True  # the key was really read: the lazy imports ran
    assert esito["pywebpush"] is False
    assert esito["aiohttp"] is False


def test_la_sonda_vede_aiohttp_quando_pywebpush_e_importato(pem_vapid) -> None:
    pem, _ = pem_vapid
    esito = _sonda(pem, prima="import pywebpush")
    assert esito["pywebpush"] is True
    assert esito["aiohttp"] is True


def test_pem_assente_resta_assente(tmp_path) -> None:
    manca = tmp_path / "vapid.pem"
    st = canale.stato_chiave(str(manca), SUB)
    assert (st.attivo, st.motivo, st.chiave_pubblica) == (False, canale.PEM_ILLEGGIBILE, None)
    assert not manca.exists()


def test_pem_non_configurato() -> None:
    for vuoto in (None, ""):
        st = canale.stato_chiave(vuoto, SUB)
        assert (st.attivo, st.motivo, st.chiave_pubblica) == (
            False,
            canale.PEM_NON_CONFIGURATO,
            None,
        )


def test_pem_che_non_e_una_chiave_p256(tmp_path) -> None:
    rotto = tmp_path / "rotto.pem"
    rotto.write_text("-----BEGIN PRIVATE KEY-----\nnon una chiave\n-----END PRIVATE KEY-----\n")
    altra_curva = tmp_path / "p384.pem"
    altra_curva.write_bytes(
        ec.generate_private_key(ec.SECP384R1()).private_bytes(
            Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()
        )
    )
    for percorso in (rotto, altra_curva):
        st = canale.stato_chiave(str(percorso), SUB)
        assert (st.attivo, st.motivo, st.chiave_pubblica) == (False, canale.PEM_NON_VALIDO, None)


def test_pubblica_e_il_punto_non_compresso_in_base64url(pem_vapid) -> None:
    pem, attesa = pem_vapid
    st = canale.stato_chiave(pem, SUB)
    assert st.chiave_pubblica == attesa
    assert "=" not in st.chiave_pubblica
    grezza = base64.urlsafe_b64decode(st.chiave_pubblica + "=" * (-len(st.chiave_pubblica) % 4))
    assert len(grezza) == 65 and grezza[0] == 0x04


def test_sub_assente_o_non_valido_spegne_ma_la_chiave_si_legge(pem_vapid) -> None:
    pem, attesa = pem_vapid
    assert canale.stato_chiave(pem, None) == canale.StatoChiave(False, canale.SUB_ASSENTE, attesa)
    assert canale.stato_chiave(pem, "") == canale.StatoChiave(False, canale.SUB_ASSENTE, attesa)
    assert canale.stato_chiave(pem, "sonda@example.org") == canale.StatoChiave(
        False, canale.SUB_NON_VALIDO, attesa
    )
    assert canale.stato_chiave(pem, SUB) == canale.StatoChiave(True, None, attesa)
    assert canale.stato_chiave(pem, "https://example.org") == canale.StatoChiave(
        True, None, attesa
    )


def test_tolleranza_e_venti_minuti() -> None:
    # Decision 16, one seat: the router serves it and the planner uses it.
    assert canale.TOLLERANZA_PUSH_MIN == 20
    assert canale.TOLLERANZA_PUSH_MS == 20 * 60 * 1000
