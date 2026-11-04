"""Pins of the server identity guard, tests/guardia_server.py -- STATO voce 7.

Decision 3 of 2026-11-04. The guard receives fake identities through its own
reading path, a fake connector in place of mysql.connector.connect, and must
stop with the Mini of Roberto's reopening of 2026-11-04 (server_uuid
75170e5c-0b6a-11f1-8a4f-4fecb2b8815e and hostname MarketReader-Server.local,
lines 123 and 121 of pt-riapertura-guardia-20261104-123557.txt), with an
unknown server and with an identity that does not read. With the dev server
it must pass, and with the CI container too: the gate pinned in both
directions.

The live test runs one pytest session against a port of 127.0.0.1 where
nothing listens -- never 3307, never an address of the Mini -- and wants it
stopped by the guard before any test: it pins the hook in conftest.py.

The module is imported by a fixture and not at the top, so that before the
guard existed each case was red on its own: the red-before of decision 3.

The bench has one row, guardia-server-ammette-chiunque in
scripts/audit/mutazioni.py: it opens the membership test, and the Mini and
the unknown server must turn red. No row closes the guard -- a guard that
admits nobody stops every session, the mutated copy's too, and the bench
reads that as a harness failure, not as a bite -- and none removes the hook,
which the live test catches without a row.
"""
from __future__ import annotations

import os
import socket
import subprocess
import sys
from pathlib import Path

import mysql.connector
import pytest

from pharmatimer_api.config import settings

BACKEND = Path(__file__).resolve().parents[1]
MINI = ("75170e5c-0b6a-11f1-8a4f-4fecb2b8815e", "MarketReader-Server.local")
SCONOSCIUTO = ("3c9e1f42-7b6d-11f1-9a0e-2f4d8c1b5e70", "un-server-qualunque.local")


@pytest.fixture
def guardia():
    from . import guardia_server

    return guardia_server


class _Cursore:
    def __init__(self, riga, errore):
        self._riga = riga
        self._errore = errore

    def execute(self, sql):
        if self._errore is not None:
            raise self._errore

    def fetchone(self):
        return self._riga

    def close(self):
        pass


class _Connessione:
    def __init__(self, riga, errore):
        self._riga = riga
        self._errore = errore

    def cursor(self):
        return _Cursore(self._riga, self._errore)

    def close(self):
        pass


def _risponde(riga, errore=None):
    """A fake connector: the server answers the identity query with riga, or execute raises."""
    chiamate = []

    def connetti(**kwargs):
        chiamate.append(kwargs)
        return _Connessione(riga, errore)

    connetti.chiamate = chiamate
    return connetti


def _non_risponde(**kwargs):
    raise mysql.connector.errors.InterfaceError(
        msg="Can't connect to MySQL server on '127.0.0.1:3306' (61)", errno=2003
    )


def test_il_mini_della_riapertura_si_ferma(guardia):
    motivo = guardia.verifica(guardia.parametri_di_test(), _risponde(MINI))
    assert motivo is not None
    assert MINI[0] in motivo and MINI[1] in motivo, motivo


def test_un_server_sconosciuto_si_ferma(guardia):
    motivo = guardia.verifica(guardia.parametri_di_test(), _risponde(SCONOSCIUTO))
    assert motivo is not None
    assert SCONOSCIUTO[0] in motivo and SCONOSCIUTO[1] in motivo, motivo


@pytest.mark.parametrize(
    "connetti",
    [
        _non_risponde,
        _risponde(None),
        _risponde((None, None)),
        _risponde(("", "un-server-qualunque.local")),
        _risponde(MINI, errore=mysql.connector.errors.ProgrammingError(msg="query rifiutata")),
    ],
    ids=["non-risponde", "nessuna-riga", "uuid-nullo", "uuid-vuoto", "query-rifiutata"],
)
def test_un_identita_che_non_si_legge_si_ferma(guardia, connetti):
    motivo = guardia.verifica(guardia.parametri_di_test(), connetti)
    assert motivo is not None
    assert f"{settings.DB_HOST}:{settings.DB_PORT}" in motivo, motivo


def test_il_server_di_dev_passa(guardia):
    connetti = _risponde((guardia.UUID_DEV, "Robertos-Mac-Studio.local"))
    assert guardia.verifica(guardia.parametri_di_test(), connetti) is None


def test_il_contenitore_della_ci_passa(guardia):
    connetti = _risponde((guardia.UUID_CI, "c0ffee000ci1"))
    assert guardia.verifica(guardia.parametri_di_test(), connetti) is None


def test_gli_ammessi_sono_due_il_dev_e_la_ci(guardia):
    assert set(guardia.SERVER_AMMESSI) == {guardia.UUID_DEV, guardia.UUID_CI}
    assert MINI[0] not in guardia.SERVER_AMMESSI


def test_la_guardia_legge_coi_parametri_del_pool_di_test(guardia):
    connetti = _risponde((guardia.UUID_DEV, "Robertos-Mac-Studio.local"))
    guardia.verifica(guardia.parametri_di_test(), connetti)
    (kwargs,) = connetti.chiamate
    assert kwargs.pop("connection_timeout") > 0
    assert kwargs == {
        "host": settings.DB_HOST,
        "port": settings.DB_PORT,
        "user": settings.DB_USER,
        "password": settings.DB_PASSWORD,
        "database": settings.DB_NAME_TEST,
        "charset": "utf8mb4",
        "collation": "utf8mb4_unicode_ci",
    }


def test_dal_vivo_la_sessione_si_ferma_su_una_porta_dove_non_ascolta_niente(guardia):
    # A port bound and released without listen(): nothing ever listened there.
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        porta = s.getsockname()[1]
    assert porta not in (3306, 3307), porta
    env = dict(os.environ, DB_HOST="127.0.0.1", DB_PORT=str(porta))
    r = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/test_guardia_server.py::test_il_server_di_dev_passa",
         "-q", "-p", "no:cacheprovider"],
        cwd=BACKEND, env=env, capture_output=True, text=True, timeout=120,
    )
    uscita = r.stdout + r.stderr
    assert r.returncode == guardia.USCITA_GUARDIA, uscita
    assert f"127.0.0.1:{porta}" in uscita and "non risponde" in uscita, uscita
    assert "passed" not in uscita, uscita
