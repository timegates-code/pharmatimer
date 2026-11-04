"""The server identity guard of the backend tests -- STATO voce 7.

conftest.py TRUNCATEs thirteen tables before every test, so the suite must
never reach a MySQL other than the two allowed here, by @@server_uuid: the
dev server of the Studio and the container of the CI. The guard reads the
identity over the connection parameters of the test pool -- parametri_di_test
is their one seat, and conftest builds the pool from it -- and on anything
else stops the session red before any test touches the DB: a uuid not in the
list, a server that does not answer, an identity that does not read. The
reason says what the guard saw.

Decisions 1-4 of 2026-11-04: never a skip in place of the stop, no marker
inside the DB, no switch. The guard reads nothing from the environment beyond
the connection parameters the tests themselves use, so no variable widens the
list or turns it off. If the dev MySQL changes, the gate stays red until
Roberto writes its new uuid here, and that is intended.

Two seats run it, both before pytest touches a table:
- conftest.py, in pytest_sessionstart: every pytest session, the mutation
  bench's included, which runs pytest on copies of the tree;
- the precondition of `make test-backend`, as `python -m tests.guardia_server`.
The CI container takes UUID_CI as its server_uuid from
.github/workflows/gate.yml, which reads it from here and writes it into the
container's auto.cnf.
"""
from __future__ import annotations

import contextlib
import sys
from typing import NamedTuple

import mysql.connector

from pharmatimer_api.config import settings

# The dev MySQL of the Studio, measured by this guard over the test
# connection at the first `make test-backend` of 2026-11-04 (decision 1):
# hostname Robertos-Mac-Studio.local, on 127.0.0.1:3306.
UUID_DEV = "8c7fac68-0b72-11f1-9c49-08cef252c2d9"
# Not a real server's: chosen for the CI. gate.yml writes it into the
# container's auto.cnf, and mysqld reads it at the restart that follows.
UUID_CI = "4b1d5c3e-9a27-4f60-b8d2-6e0c71a95f34"

SERVER_AMMESSI = {
    UUID_DEV: "il MySQL di dev dello Studio",
    UUID_CI: "il contenitore MySQL della CI",
}

# pytest's exit status when the guard stops the session: none of pytest's own.
USCITA_GUARDIA = 7
TIMEOUT_S = 10


class Identita(NamedTuple):
    server_uuid: str | None
    hostname: str | None
    errore: str | None = None


def parametri_di_test() -> dict:
    """The connection parameters of the test pool: one seat, for the guard and for conftest."""
    return {
        "host": settings.DB_HOST,
        "port": settings.DB_PORT,
        "user": settings.DB_USER,
        "password": settings.DB_PASSWORD,
        "database": settings.DB_NAME_TEST,
        "charset": "utf8mb4",
        "collation": "utf8mb4_unicode_ci",
    }


def luogo(parametri: dict) -> str:
    return f"{parametri['host']}:{parametri['port']}"


def leggi_identita(parametri: dict, connetti=mysql.connector.connect) -> Identita:
    """@@server_uuid and @@hostname over one connection with parametri. Never raises."""
    try:
        conn = connetti(connection_timeout=TIMEOUT_S, **parametri)
    except Exception as exc:
        return Identita(None, None, f"il server non risponde: {exc}")
    try:
        cur = conn.cursor()
        cur.execute("SELECT @@server_uuid, @@hostname")
        riga = cur.fetchone()
        cur.close()
    except Exception as exc:
        return Identita(None, None, f"l'identita non si legge: {exc}")
    finally:
        with contextlib.suppress(Exception):
            conn.close()
    if not riga or not riga[0]:
        return Identita(None, None, f"l'identita non si legge: la risposta e {riga!r}")
    return Identita(str(riga[0]), None if riga[1] is None else str(riga[1]))


def giudica(identita: Identita, dove: str) -> str | None:
    """None if the server is allowed; otherwise why the session stops, with what was seen."""
    if identita.errore is not None:
        return f"GUARDIA DEL SERVER: fermo, su {dove} {identita.errore}"
    if identita.server_uuid not in SERVER_AMMESSI:
        return (
            f"GUARDIA DEL SERVER: fermo, il server su {dove} non e fra gli ammessi: "
            f"server_uuid {identita.server_uuid}, hostname {identita.hostname}"
        )
    return None


def verifica(parametri: dict, connetti=mysql.connector.connect) -> str | None:
    """None if the server at parametri is allowed; otherwise why the session stops."""
    return giudica(leggi_identita(parametri, connetti), luogo(parametri))


def main() -> int:
    """The precondition of make test-backend: the verdict on one line, 0 if allowed."""
    parametri = parametri_di_test()
    identita = leggi_identita(parametri)
    motivo = giudica(identita, luogo(parametri))
    if motivo is not None:
        print("ROSSO  " + motivo)
        return 1
    print(
        f"   OK  {SERVER_AMMESSI[identita.server_uuid]}: server_uuid {identita.server_uuid}, "
        f"hostname {identita.hostname}, su {luogo(parametri)}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
