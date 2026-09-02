"""
PharmaTimer -- INVARIANTE DI COPPIA ora_ricalcolata / recupero_minuti.

Permanent, versioned suite, collected by a bare `pytest` run. Introduced at
par.22.198-quadragies-quater by explicit deroga, which SUPERSEDES Q-TER-5=A
(probe kept outside the repo) and Q-BIS-2=A (file name deliberately not
collectible). Both had optimized for the pytest baseline of 114 instead of for
the clinical metro: a confirmed M1+M3 defect cannot stay watched by a file that
lives outside the repo and runs only if somebody remembers it. The historical
copy in ~/PharmaTimer_sonde/sonda_invariante_coppia.py is left in place as a
record of the measurement session and is no longer the collaudo of the fix.

WHAT THESE TESTS ASSERT
Every discriminating test asserts the CORRECT value -- the one a guarded pair
produces. Characterization tests of the broken behavior were rejected: a suite
that asserts as CORRECT what is wrong misleads whoever maintains it.

THE REGIME, AND ITS CHANGE AT fix-invariante-coppia (Q-COPPIA-3=A)
HISTORICAL, kept as record. While s.6.268 lived, every discriminating test
carried xfail(strict=True): the day a site was repaired its test would turn
XPASS, which under strict is a FAILURE, so the suite would break instead of
staying green in silence. That is what happened, and it was MEASURED before
the markers were touched -- five sites repaired, eleven XPASS(strict) in one
run, 118 passed beside them.
FROM HERE ON the steps are HARD tests, and they are THIRTEEN: the mutation
collaudo of the fix found the :546 site repaired but covered by nothing, so
SC-9.1 was minted for it (Q-COPPIA-6=A). Two consequences, and the second is
not an improvement in disguise:
  - They now intercept ANY deviation from the correct value, a worsening
    included. Limit 1 below described the opposite and no longer holds.
  - They no longer inherit the LC-106 guarantee described further down. A step
    ADDED to this file from here on must be shown discriminating by MUTATION;
    the structure of a decorator no longer does it for free. SC-9.1 was the
    first step to pay that price, and it paid it.

GRANULARITY (Q-QUATER-2=B)
One test per STEP: twelve at Q-QUATER-2=B, THIRTEEN from fix-invariante-coppia.
One test per SCENARIO was refused on measurement, not on preference: xfail
lived on the TEST, so with three steps inside SC-1 a partial fix of one site
would have left the test red and silent. Only :443 and :154 would have carried
an isolated signal -- two sites out of five. That sentence aged into a finding:
at the fix, mutation measured :546 to carry NO signal at all, and SC-9.1 exists
because of it. One test per step costs one execution of a sequence per step
instead of one per scenario; the setups are shared through the _seq_* functions
below and are never duplicated, because setups that diverge give measurements
that diverge.

LC-106 WAS STRUCTURAL WHILE THE MARKERS LIVED. DO NOT RESTORE THE CHECK
The sonda this file replaces carried an `assert h1 != h0` inside _declara, to
refuse a step whose two hypotheses predict the same value. With one step per
test that guard was automatic: a non-discriminating step -- broken value equal
to the correct one -- would satisfy the assertion, produce XPASS and turn red
under strict. HISTORICAL from fix-invariante-coppia: with no marker left, a
non-discriminating step simply passes. Nothing is owed for the steps already
here: the eleven that carried markers were red for their whole life and turned
XPASS together in one measured run, SC-7.1 was freed a session earlier by
s.6.269, and SC-9.1 was shown discriminating by mutation when it was minted.
The debt falls on any step added from here on. Adding an h1/h0 comparison back
would still only add dead code, because `rotto` is now a frozen historical
value and not a live prediction.

WHY SC-8 IS A HARD TEST AND NEVER xfail
xfail swallows ANY exception, so a broken setup was indistinguishable from the
defect being present. SC-8 is what made xfail safe: a broken setup never
registers its step, coverage falls below thirteen and SC-8 -- which is not xfail
-- goes red. That failure mode was seen for real at fix-invariante-coppia, in a
run where the database was unreachable: 11 xfailed beside 118 errors, every
marker quietly swallowing its own broken setup. With the markers gone a broken
setup is a plain red, but SC-8 keeps two jobs that nothing else does: it
asserts COVERAGE, so a partial run cannot print a reassuring OK, and it asserts
the SHAPE of the known defect for any step that goes nonconforming again
(Q-QUATER-3=A). It never asserts conformity, so it was green before the fix and
is green after it.

LIMITS, DECLARED
1. HISTORICAL, superseded. While the markers lived, xfail intercepted the
   CHANGE of the sites listed here, a partial fix included, and did NOT
   intercept a worsening. Now the thirteen are hard and a worsening in a listed
   site is a red like any other. What is still NOT intercepted is the
   appearance of the defect in a site NOT listed here.
2. The signal reaches the CP0 gate through `ck PYTEST_RC "0"` in scripts/cp0.sh
   AND, now, through `ck PYTEST`: a hard test that fails moves the count of
   passed tests, which under strict xfail it did not. Historical form of this
   limit: with 117 expected, an XPASS printed "117 passed, ..., 1 failed" and
   the gate still read 117. `ck XFAILED` remains in cp0.sh with an expected of
   zero (Q-COPPIA-1=A), so a marker parked here again is a DRIFT.
3. SC-8 needs module order and a full run: `pytest -k` on a single test leaves
   coverage below thirteen and SC-8 goes red. No plugin that reorders or
   distributes tests is installed (pyproject declares pytest and
   pytest-asyncio only).
4. HISTORICAL, and the trap is worth keeping. THE FAITHFUL PROBE FOR "HAS THE
   FIX ARRIVED" WAS THE EXIT CODE of pytest, or a pattern anchored at the start
   of the summary line. A bare `grep XPASS` on the pytest log was NOT: pytest
   echoes the reason of every XFAIL into that log, so any occurrence of the
   token inside a reason answered yes while nothing had changed. Measured trap,
   family LC-89. With no marker left there are no reasons to echo, so the trap
   is disarmed by construction rather than avoided.

PERIMETER
Server-side only. Reachability from the PWA is not measured here and is
asserted in no direction.

NORMATIVE SOURCE
Deviation s.6.268 in the Fase 3 Changelog, EXTINGUISHED at fix-invariante-
coppia together with its row in scripts/impegni.tsv, which was removed because
closing a commitment IS removing its row. The live rule now lives in the
module comment at the top of routers/log_assunzioni.py; this file is what keeps
it honest. Row `n3-stato-destinazione` for SC-7, which measures a DIFFERENT
defect and names its own guard.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from datetime import time as dtime
from typing import Any, NamedTuple

# `import pytest` was removed with the eleven markers: it had no other
# consumer here, measured at zero `pytest.` references. Opposite call to
# Q-QQUIN-6=A, where an import declared orphan turned out to have one.
from pharmatimer_api.config import settings

# ---------------------------------------------------------------------------
# STATIC GUARD, evaluated at IMPORT time.
#
# This runs during collection, before pytest builds any fixture, therefore
# before the autouse TRUNCATE of conftest.py. A failure here means zero tests
# ran and zero tables were truncated. test_sc0 measures the pool and is a
# DETECTOR only: by then the TRUNCATE has already happened.
# ---------------------------------------------------------------------------
if settings.DB_NAME_TEST == settings.DB_NAME:
    raise RuntimeError(
        "SUITE ABORTITA: DB_NAME_TEST coincide con DB_NAME "
        f"({settings.DB_NAME!r}). La suite esegue TRUNCATE autouse su otto "
        "tabelle: questi test non girano contro il database di sviluppo."
    )

# ---------------------------------------------------------------------------
# Sagoma reuse (LC-93): import the collaudate helpers, never transcribe them.
#
# tests/__init__.py exists, so `tests` IS a package and pytest -- in default
# `prepend` mode, since pyproject.toml declares no importmode -- names this
# module tests.test_invariante_coppia. A bare import cannot resolve. The
# relative form binds to the sibling inside THIS package and cannot be
# shadowed by another `tests` on sys.path.
#
# An ImportError still means the sagoma moved -- a RED, never a reason to fall
# back on a remembered copy.
# ---------------------------------------------------------------------------
try:
    from .test_log_transitions_recupero import _post_recupero, _setup_gap120
except ImportError as exc:  # pragma: no cover - loud by design
    raise RuntimeError(
        "SUITE ABORTITA: sagoma test_log_transitions_recupero non importabile "
        f"({exc}). Una sagoma ricordata non e fedele: fermarsi e rimisurare."
    ) from exc


_PASSI_DISCRIMINANTI_ATTESI = 13
_CONTROLLI_ATTESI = 2

_REGISTRO: dict[str, dict[str, Any]] = {}

_GUARDIA_COPPIA = "s.6.268 / fix-invariante-coppia"
_GUARDIA_N3 = "n3-stato-destinazione"

# ora_prevista of the recalculated dose planted by the imported _setup_gap120.
# SC-4 replants the same value for its own dose 3. COUPLING DECLARED: if the
# sagoma moves this hour, the verbs below stop matching the planted row and the
# setup asserts go red -- loudly, which is the intended failure mode.
_ORA_PREVISTA_TARGET = "16:00:00"
_ORA_PREVISTA_MEZZANOTTE = "23:30:00"


class Passo(NamedTuple):
    """One discriminating step: where it lives, what it should say, what it
    says today, and what was actually measured."""

    sede: str
    corretto: Any
    rotto: Any
    misurato: Any
    guardia: str = _GUARDIA_COPPIA


def _esigi(chiave: str, passo: Passo) -> None:
    """Register the step, THEN demand the correct value.

    Registration happens BEFORE the assertion on purpose: the thirteen callers
    are expected to fail today, and SC-8 must still be able to count coverage.
    A step that never registers means its sequence broke before reaching the
    measurement, which is exactly what SC-8 is there to catch.
    """
    _REGISTRO[chiave] = {
        "tipo": "DISCRIMINANTE",
        "sede": passo.sede,
        "corretto": passo.corretto,
        "rotto": passo.rotto,
        "misurato": passo.misurato,
        "conforme": passo.misurato == passo.corretto,
        "guardia": passo.guardia,
    }
    assert passo.misurato == passo.corretto, (
        f"{chiave} ({passo.sede}): invariante NON rispettato. "
        f"Atteso {passo.corretto!r}, misurato {passo.misurato!r}. "
        f"Valore rotto atteso oggi: {passo.rotto!r}. "
        f"Sotto guardia come {passo.guardia}."
    )


def _controllo(chiave: str, sede: str, atteso: Any, misurato: Any) -> None:
    """Register a POSITIVE CONTROL: one expected value, defect or no defect.

    If a control fails the instrument is rigged and every other measurement
    taken by this file is worthless. Controls are NEVER xfail.
    """
    _REGISTRO[chiave] = {
        "tipo": "CONTROLLO",
        "sede": sede,
        "corretto": atteso,
        "rotto": atteso,
        "misurato": misurato,
        "conforme": misurato == atteso,
        "guardia": _GUARDIA_COPPIA,
    }
    assert misurato == atteso, (
        f"{chiave} ({sede}): CONTROLLO POSITIVO FALLITO. Atteso {atteso!r}, "
        f"misurato {misurato!r}. Lo strumento e truccato: scartare ogni altra "
        "misura di questo file."
    )


# ===========================================================================
# Helper di lettura e di verbo
# ===========================================================================
def _read_row(pool, utente_id: int, farmaco_id: int, data_: date,
              dose_numero: int) -> dict[str, Any]:
    """Ground truth straight from the table.

    Deliberately NOT the verb response body: the Response model exposes 14 of
    15 columns by choice, and a measurement of the pair must not be filtered
    through a shaping layer.
    """
    conn = pool.get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id, stato, ora_prevista, ora_effettiva, delta_minuti, "
            "ora_ricalcolata, gap_minuti, recupero_minuti "
            "FROM log_assunzioni "
            "WHERE utente_id = %s AND farmaco_id = %s "
            "AND data = %s AND dose_numero = %s",
            (utente_id, farmaco_id, data_, dose_numero),
        )
        row = cur.fetchone()
        cur.close()
    finally:
        conn.close()
    assert row is not None, (
        f"riga assente (dose {dose_numero}, data {data_}): posa fallita, "
        "non un esito della misura"
    )
    return row


def _hdr(token: str) -> dict[str, str]:
    return {"X-User-Token": token}


def _saltata(client, token: str, farmaco_id: int, today: date,
             dose_numero: int, ora_prevista: str):
    return client.post(
        f"/api/farmaci/{farmaco_id}/log/saltata",
        json={
            "data": today.isoformat(),
            "dose_numero": dose_numero,
            "ora_prevista": ora_prevista,
        },
        headers=_hdr(token),
    )


def _sospesa(client, token: str, farmaco_id: int, today: date,
             dose_numero: int, ora_prevista: str):
    """Payload shape transcribed by analogy with /saltata.

    DECLARED UNMEASURED: the payload model of /sospesa was not dumped. The two
    routes are twins in the source, so the risk of a wrong shape is a loud 422
    -- a defect of this file, never a finding about the pair.
    """
    return client.post(
        f"/api/farmaci/{farmaco_id}/log/sospesa",
        json={
            "data": today.isoformat(),
            "dose_numero": dose_numero,
            "ora_prevista": ora_prevista,
        },
        headers=_hdr(token),
    )


def _undo(client, token: str, farmaco_id: int, today: date, dose_numero: int):
    return client.post(
        f"/api/farmaci/{farmaco_id}/log/undo",
        json={"data": today.isoformat(), "dose_numero": dose_numero},
        headers=_hdr(token),
    )


def _posa_cross_midnight(client, token, owner_id, insert_test_farmaco, nome):
    """Transcribed from test_log_transitions_recupero.py :245-277.

    dose 1 planned 20:00 taken 22:00 (gap 120); nested dose 2 planned 23:30 on
    day D, ora_ricalcolata 01:30 of day D+1.
    Returns (farmaco_id, today, planned, base).
    """
    farmaco_id = insert_test_farmaco(
        utente_id=owner_id, nome=nome, tipo_frequenza="intervallo",
        intervallo_ore="8.0",
        # Decisione 2 (intervallo minimo lato server): the scenario posts the
        # recalculated dose 210 real minutes after the presa (22:00 -> 01:30),
        # under a 4-hour minimum the server would now REFUSE D+1 and the
        # scenario would measure nothing. The minimum is not what this file
        # measures -- tests/test_intervallo_minimo.py does -- so it is off.
        intervallo_minimo_ore=None, dosi_giornaliere=3,
    )
    today = date.today()
    planned = datetime.combine(today, dtime(23, 30))
    base = planned + timedelta(minutes=120)
    r = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json={
            "data": today.isoformat(),
            "dose_numero": 1,
            "ora_prevista": "20:00:00",
            "ora_effettiva": datetime.combine(today, dtime(22, 0)).isoformat(),
            "delta_minuti": 120,
            "gap_minuti": 120,
            "recupero_minuti": 0,
            "ricalcolo_dose_successiva": {
                "dose_numero": 2,
                "data": today.isoformat(),
                "ora_prevista": _ORA_PREVISTA_MEZZANOTTE,
                "ora_ricalcolata": base.isoformat(),
                "gap_minuti": 120,
            },
        },
        headers=_hdr(token),
    )
    assert r.status_code == 201, r.text
    return farmaco_id, today, planned, base


# ===========================================================================
# SEQUENZE -- una per scenario, definita UNA VOLTA.
#
# Each _seq_* runs its scenario end to end and returns the Passo of every step
# it produces. A test picks its own key and asserts nothing else: this is what
# keeps thirteen tests from growing thirteen divergent setups. Cost: a sequence
# with N steps is executed N times, once per test. Accepted on purpose.
#
# Isolation is a property of the fixtures, measured not assumed:
# cleanup_test_data is autouse at function scope, seed_owner_test creates a new
# owner per test, and db_test_pool carries a pool and no state. No step depends
# on the wall clock: the post-check compares ora_ricalcolata against values
# stored during the same sequence, so SC-1b holds across midnight too.
# ===========================================================================
def _seq_sc1(client, token, owner_id, insert_test_farmaco, pool):
    """Sites :346 -> :546 -> :696, intra-day. The M3 demonstration."""
    farmaco_id, today, base = _setup_gap120(
        client, token, owner_id, insert_test_farmaco, "SC1"
    )

    # POSA -- identical whether the pair is guarded or not.
    r = _post_recupero(client, token, farmaco_id, today, 30)
    assert r.status_code == 200, r.text
    row = _read_row(pool, owner_id, farmaco_id, today, 2)
    assert row["ora_ricalcolata"] == base - timedelta(minutes=30)
    assert row["recupero_minuti"] == 30

    passi = {}

    # STEP 1 -- :346 post_saltata zeroes recupero_minuti.
    r_sal = _saltata(client, token, farmaco_id, today, 2, _ORA_PREVISTA_TARGET)
    assert r_sal.status_code in (200, 201), r_sal.text
    row = _read_row(pool, owner_id, farmaco_id, today, 2)
    assert row["recupero_minuti"] == 0
    passi["SC-1.1"] = Passo(
        sede=":346 post_saltata",
        corretto=base,
        rotto=base - timedelta(minutes=30),
        misurato=row["ora_ricalcolata"],
    )

    # STEP 2 -- :546 post_undo returns the row to 'ricalcolata'.
    r_undo = _undo(client, token, farmaco_id, today, 2)
    assert r_undo.status_code == 200, r_undo.text
    row = _read_row(pool, owner_id, farmaco_id, today, 2)
    assert row["stato"] == "ricalcolata"
    assert row["recupero_minuti"] == 0
    passi["SC-1.2"] = Passo(
        sede=":546 post_undo",
        corretto=base,
        rotto=base - timedelta(minutes=30),
        misurato=row["ora_ricalcolata"],
    )

    # STEP 3 -- :696 post_recupero rebuilds the base from a zeroed total.
    r2 = _post_recupero(client, token, farmaco_id, today, 30)
    assert r2.status_code == 200, r2.text
    row = _read_row(pool, owner_id, farmaco_id, today, 2)
    assert row["recupero_minuti"] == 30
    passi["SC-1.3"] = Passo(
        sede=":696 post_recupero su base falsa",
        corretto=base - timedelta(minutes=30),
        rotto=base - timedelta(minutes=60),
        misurato=row["ora_ricalcolata"],
    )
    return passi


def _seq_sc1b(client, token, owner_id, insert_test_farmaco, pool):
    """The same three sites, with the dose beyond midnight.

    The floor is TIMESTAMP(data, ora_prevista) = D 23:30. While the defect
    lives the last step lands exactly on it, dragging the dose back across the
    day boundary while the record states half the shift.
    """
    farmaco_id, today, planned, base = _posa_cross_midnight(
        client, token, owner_id, insert_test_farmaco, "SC1b"
    )

    # POSA -- identical whether the pair is guarded or not.
    r = _post_recupero(client, token, farmaco_id, today, 60)
    assert r.status_code == 200, r.text
    row = _read_row(pool, owner_id, farmaco_id, today, 2)
    assert row["ora_ricalcolata"] == base - timedelta(minutes=60)
    assert row["recupero_minuti"] == 60

    passi = {}

    # STEP 1 -- :346 across midnight.
    r_sal = _saltata(
        client, token, farmaco_id, today, 2, _ORA_PREVISTA_MEZZANOTTE
    )
    assert r_sal.status_code in (200, 201), r_sal.text
    row = _read_row(pool, owner_id, farmaco_id, today, 2)
    assert row["recupero_minuti"] == 0
    passi["SC-1b.1"] = Passo(
        sede=":346 post_saltata cross-midnight",
        corretto=base,
        rotto=base - timedelta(minutes=60),
        misurato=row["ora_ricalcolata"],
    )

    # STEP 2 -- :546 across midnight.
    r_undo = _undo(client, token, farmaco_id, today, 2)
    assert r_undo.status_code == 200, r_undo.text
    row = _read_row(pool, owner_id, farmaco_id, today, 2)
    assert row["stato"] == "ricalcolata"
    passi["SC-1b.2"] = Passo(
        sede=":546 post_undo cross-midnight",
        corretto=base,
        rotto=base - timedelta(minutes=60),
        misurato=row["ora_ricalcolata"],
    )

    # STEP 3 -- the dose crosses the day boundary backwards.
    r2 = _post_recupero(client, token, farmaco_id, today, 60)
    assert r2.status_code != 409, (
        "SC-1b.3: 409 allo ultimo passo. NON e conformita: e il falso-anticipo "
        "della famiglia s.6.247 tornato da unaltra porta. RED a se: fermarsi e "
        "verbalizzare, non concludere sulla coppia."
    )
    assert r2.status_code == 200, r2.text
    row = _read_row(pool, owner_id, farmaco_id, today, 2)
    assert row["recupero_minuti"] == 60
    passi["SC-1b.3"] = Passo(
        sede=":696 post_recupero, pavimento D 23:30",
        corretto=base - timedelta(minutes=60),
        rotto=planned,
        misurato=row["ora_ricalcolata"],
    )
    return passi


def _seq_sc2(client, token, owner_id, insert_test_farmaco, pool):
    """UPDATE of identical shape to :346, on the /sospesa route."""
    farmaco_id, today, base = _setup_gap120(
        client, token, owner_id, insert_test_farmaco, "SC2"
    )
    assert _post_recupero(
        client, token, farmaco_id, today, 30
    ).status_code == 200

    r = _sospesa(client, token, farmaco_id, today, 2, _ORA_PREVISTA_TARGET)
    assert r.status_code in (200, 201), r.text
    row = _read_row(pool, owner_id, farmaco_id, today, 2)
    assert row["stato"] == "sospesa"
    assert row["recupero_minuti"] == 0
    return {
        "SC-2.1": Passo(
            sede=":443 post_sospesa",
            corretto=base,
            rotto=base - timedelta(minutes=30),
            misurato=row["ora_ricalcolata"],
        )
    }


def _seq_sc3(client, token, owner_id, insert_test_farmaco, pool):
    """Writes gap_minuti and recupero_minuti from payload, leaves the time.

    The /recupero that would normally follow is NOT run: with gap_minuti driven
    to 0 by the payload the route answers 409 'Nessun gap da recuperare', so
    that step would be non-discriminating. Consequence already on record at
    Changelog :13611.
    """
    farmaco_id, today, base = _setup_gap120(
        client, token, owner_id, insert_test_farmaco, "SC3"
    )
    assert _post_recupero(
        client, token, farmaco_id, today, 30
    ).status_code == 200

    r = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json={
            "data": today.isoformat(),
            "dose_numero": 2,
            "ora_prevista": _ORA_PREVISTA_TARGET,
            "ora_effettiva": datetime.combine(
                today, dtime(17, 30)
            ).isoformat(),
            "delta_minuti": 90,
            "gap_minuti": 0,
            "recupero_minuti": 0,
        },
        headers=_hdr(token),
    )
    assert r.status_code in (200, 201), r.text
    row = _read_row(pool, owner_id, farmaco_id, today, 2)
    assert row["stato"] == "presa"
    assert row["recupero_minuti"] == 0
    return {
        "SC-3.1": Passo(
            sede=":154 post_presa ramo UPDATE",
            corretto=base,
            rotto=base - timedelta(minutes=30),
            misurato=row["ora_ricalcolata"],
        )
    }


def _seq_sc4(client, token, owner_id, insert_test_farmaco, pool):
    """The only site that renews ora_ricalcolata and keeps a stale total.

    Consequence: a later reset to zero moves the dose LATER than the
    recalculation instead of restoring it. This is the opposite direction from
    every other step in this file.
    """
    farmaco_id = insert_test_farmaco(
        utente_id=owner_id, nome="SC4", tipo_frequenza="intervallo",
        intervallo_ore="8.0", intervallo_minimo_ore="4.0", dosi_giornaliere=3,
    )
    today = date.today()
    base3 = datetime.combine(today, dtime(18, 0))

    # dose 1 presa, nested pointing at dose 3.
    r1 = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json={
            "data": today.isoformat(),
            "dose_numero": 1,
            "ora_prevista": "08:00:00",
            "ora_effettiva": datetime.combine(today, dtime(10, 0)).isoformat(),
            "delta_minuti": 120,
            "gap_minuti": 120,
            "recupero_minuti": 0,
            "ricalcolo_dose_successiva": {
                "dose_numero": 3,
                "data": today.isoformat(),
                "ora_prevista": _ORA_PREVISTA_TARGET,
                "ora_ricalcolata": base3.isoformat(),
                "gap_minuti": 120,
            },
        },
        headers=_hdr(token),
    )
    assert r1.status_code == 201, r1.text

    r_rec = client.post(
        f"/api/farmaci/{farmaco_id}/log/recupero",
        json={
            "data": today.isoformat(),
            "dose_numero": 3,
            "recupero_minuti": 30,
        },
        headers=_hdr(token),
    )
    assert r_rec.status_code == 200, r_rec.text

    # dose 2 presa, nested re-pointing dose 3 to a NEW time.
    nuovo = datetime.combine(today, dtime(20, 0))
    r2 = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json={
            "data": today.isoformat(),
            "dose_numero": 2,
            "ora_prevista": "12:00:00",
            "ora_effettiva": datetime.combine(today, dtime(16, 0)).isoformat(),
            "delta_minuti": 240,
            "gap_minuti": 240,
            "recupero_minuti": 0,
            "ricalcolo_dose_successiva": {
                "dose_numero": 3,
                "data": today.isoformat(),
                "ora_prevista": _ORA_PREVISTA_TARGET,
                "ora_ricalcolata": nuovo.isoformat(),
                "gap_minuti": 240,
            },
        },
        headers=_hdr(token),
    )
    assert r2.status_code == 201, r2.text
    row = _read_row(pool, owner_id, farmaco_id, today, 3)
    assert row["stato"] == "ricalcolata"
    assert row["ora_ricalcolata"] == nuovo

    passi = {
        "SC-4.1": Passo(
            sede=":205 ricalcolo D+1, totale residuo",
            corretto=0,
            rotto=30,
            misurato=row["recupero_minuti"],
        )
    }

    # A reset to zero now moves the dose LATER than the recalculation.
    r3 = client.post(
        f"/api/farmaci/{farmaco_id}/log/recupero",
        json={
            "data": today.isoformat(),
            "dose_numero": 3,
            "recupero_minuti": 0,
        },
        headers=_hdr(token),
    )
    assert r3.status_code == 200, r3.text
    row = _read_row(pool, owner_id, farmaco_id, today, 3)
    passi["SC-4.2"] = Passo(
        sede=":696 reset su totale residuo, direzione opposta",
        corretto=nuovo,
        rotto=nuovo + timedelta(minutes=30),
        misurato=row["ora_ricalcolata"],
    )
    return passi


def _seq_sc5(client, token, owner_id, insert_test_farmaco, pool):
    """Zero should restore the original recalculated time. After the cycle it
    restores nothing, because the base it rebuilds is already false."""
    farmaco_id, today, base = _setup_gap120(
        client, token, owner_id, insert_test_farmaco, "SC5"
    )
    assert _post_recupero(
        client, token, farmaco_id, today, 30
    ).status_code == 200
    assert _saltata(
        client, token, farmaco_id, today, 2, _ORA_PREVISTA_TARGET
    ).status_code in (200, 201)
    assert _undo(client, token, farmaco_id, today, 2).status_code == 200

    r = _post_recupero(client, token, farmaco_id, today, 0)
    assert r.status_code == 200, r.text
    row = _read_row(pool, owner_id, farmaco_id, today, 2)
    assert row["recupero_minuti"] == 0
    return {
        "SC-5.1": Passo(
            sede="s.6.264 punto zero su base falsa",
            corretto=base,
            rotto=base - timedelta(minutes=30),
            misurato=row["ora_ricalcolata"],
        )
    }


def _seq_sc6(client, token, owner_id, insert_test_farmaco, pool):
    """The site that writes both columns in the same UPDATE: :578 rollback D+1.

    Defect or no defect, this one is expected to say the same thing. Returns
    (atteso, misurato).
    """
    farmaco_id, today, base = _setup_gap120(
        client, token, owner_id, insert_test_farmaco, "SC6"
    )
    assert _post_recupero(
        client, token, farmaco_id, today, 30
    ).status_code == 200

    r = _undo(client, token, farmaco_id, today, 1)
    assert r.status_code == 200, r.text
    row = _read_row(pool, owner_id, farmaco_id, today, 2)
    return (
        ("prevista", None, 0, 0),
        (
            row["stato"], row["ora_ricalcolata"],
            row["gap_minuti"], row["recupero_minuti"],
        ),
    )


def _seq_sc7(client, token, owner_id, insert_test_farmaco, pool):
    """:202-212 now guards the destination state -- s.6.269, Q-QBIS-1=A.

    Sites :143, :334 and :431 refuse a transition from a closed state with
    409. This branch used to select `stato` under FOR UPDATE and never read
    it, so a dose already taken came back as 'ricalcolata' with ora_effettiva
    still populated: the record called 'due' a dose that had been taken (M1)
    and kept the taken time on it (M3).

    DIFFERENT DEFECT from the pair: it was guarded by n3-stato-destinazione,
    not by s.6.268.

    WHY corretto IS 201 AND NOT 409. s.6.269: the guard SKIPS the
    recalculation and confirms dose D, instead of refusing the whole request.
    Refusing would roll back dose D, and a 4xx parks the queued element with
    no retry (Spec 14.3), so a real intake would never reach the server and
    would stay invisible until CS-5 (M2). Conformity is therefore 201 with
    D+1 left 'presa' and its ora_effettiva intact.

    REACHABILITY FROM THE PWA, measured at quadragies-quater-bis: the client
    guard in recalc.js :417 reads the LOCAL mirror at tap time while the
    payload is frozen and delivered later by the queue, so it cannot bind the
    server state at the moment of the UPDATE. Only the site holding the lock
    can, and that is this one.
    """
    farmaco_id = insert_test_farmaco(
        utente_id=owner_id, nome="SC7", tipo_frequenza="intervallo",
        intervallo_ore="8.0", intervallo_minimo_ore="4.0", dosi_giornaliere=3,
    )
    today = date.today()

    r_pre = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json={
            "data": today.isoformat(),
            "dose_numero": 2,
            "ora_prevista": _ORA_PREVISTA_TARGET,
            "ora_effettiva": datetime.combine(today, dtime(16, 5)).isoformat(),
            "delta_minuti": 5,
            "gap_minuti": 0,
            "recupero_minuti": 0,
        },
        headers=_hdr(token),
    )
    assert r_pre.status_code == 201, r_pre.text

    # The status code of THIS call is part of the measurement, never asserted.
    r = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json={
            "data": today.isoformat(),
            "dose_numero": 1,
            "ora_prevista": "08:00:00",
            "ora_effettiva": datetime.combine(today, dtime(10, 0)).isoformat(),
            "delta_minuti": 120,
            "gap_minuti": 120,
            "recupero_minuti": 0,
            "ricalcolo_dose_successiva": {
                "dose_numero": 2,
                "data": today.isoformat(),
                "ora_prevista": _ORA_PREVISTA_TARGET,
                "ora_ricalcolata": datetime.combine(
                    today, dtime(18, 0)
                ).isoformat(),
                "gap_minuti": 120,
            },
        },
        headers=_hdr(token),
    )
    row = _read_row(pool, owner_id, farmaco_id, today, 2)
    return {
        "SC-7.1": Passo(
            sede=":202-212 guardia dello stato di destinazione (s.6.269)",
            corretto=(201, "presa", True),
            rotto=(201, "ricalcolata", True),
            misurato=(
                r.status_code, row["stato"], row["ora_effettiva"] is not None
            ),
            guardia=_GUARDIA_N3,
        )
    }


def _seq_sc9(client, token, owner_id, insert_test_farmaco, pool):
    """:546 post_undo reached with a LIVE total -- the only path that
    exercises the restore at that site.

    ADDED at fix-invariante-coppia (Q-COPPIA-6=A) because the mutation
    collaudo measured that site to be repaired and UNCOVERED. In SC-1, SC-1b
    and SC-5 the /undo always follows a /saltata, which has already zeroed the
    total, so rec_old is zero and there is nothing to give back: reverting the
    undo site left the whole suite green at 129. A repaired site no test can
    redden is a decoration, not a guard.

    The sequence is the one the pilot actually walks: a dose carrying a
    recovery is TAKEN, and the take is then undone. /presa forwards the stored
    total verbatim -- recalc.js buildLogWrite sends entry.recupero_minuti --
    so the row reaches /undo still anticipated by 30 while the record says 30,
    and the undo is what has to give the time back.

    DISCRIMINATION IS NOT INHERITED HERE. The markers are gone, so this step
    does not get the LC-106 guarantee for free (see the docstring at the top):
    it was shown discriminating by MUTATION, reverting rec_old at the undo
    site and demanding this test red.
    """
    farmaco_id, today, base = _setup_gap120(
        client, token, owner_id, insert_test_farmaco, "SC9"
    )
    assert _post_recupero(
        client, token, farmaco_id, today, 30
    ).status_code == 200

    r_presa = client.post(
        f"/api/farmaci/{farmaco_id}/log/presa",
        json={
            "data": today.isoformat(),
            "dose_numero": 2,
            "ora_prevista": _ORA_PREVISTA_TARGET,
            "ora_effettiva": datetime.combine(today, dtime(17, 30)).isoformat(),
            "delta_minuti": 90,
            "gap_minuti": 120,
            "recupero_minuti": 30,
        },
        headers=_hdr(token),
    )
    assert r_presa.status_code in (200, 201), r_presa.text

    # POSA. /presa declares the same total it found, so the pair must NOT move
    # here: this is a setup guard, not the measurement. If it fails, the /presa
    # site is broken and nothing this sequence says about /undo is worth
    # reading -- which is why the step then fails to register and SC-8 goes red
    # too, instead of this file attributing someone else's defect to the undo.
    row = _read_row(pool, owner_id, farmaco_id, today, 2)
    assert row["stato"] == "presa"
    assert row["recupero_minuti"] == 30
    assert row["ora_ricalcolata"] == base - timedelta(minutes=30)

    r_undo = _undo(client, token, farmaco_id, today, 2)
    assert r_undo.status_code == 200, r_undo.text
    row = _read_row(pool, owner_id, farmaco_id, today, 2)
    assert row["stato"] == "ricalcolata"
    assert row["recupero_minuti"] == 0
    return {
        "SC-9.1": Passo(
            sede=":546 post_undo su totale VIVO",
            corretto=base,
            rotto=base - timedelta(minutes=30),
            misurato=row["ora_ricalcolata"],
        )
    }


# ===========================================================================
# SC-0 -- CONTROLLO POSITIVO di sede. Test DURO, mai xfail.
# ===========================================================================
def test_sc0_guardia_di_sede_empirica(db_test_pool) -> None:
    """The pool must actually resolve to DB_NAME_TEST.

    A declared target is not an applied one (Lesson #27), so this measures
    SELECT DATABASE() instead of trusting the setting.

    LIMIT DECLARED: the autouse TRUNCATE runs before this test. This step is a
    DETECTOR. The PREVENTER is the import-time guard at the top of the file,
    which aborts collection before any fixture is built.
    """
    conn = db_test_pool.get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT DATABASE()")
        in_uso = cur.fetchone()[0]
        cur.close()
    finally:
        conn.close()
    assert in_uso != settings.DB_NAME, (
        f"SUITE SU DATABASE SBAGLIATO: {in_uso!r} e DB_NAME."
    )
    _controllo("SC-0", "pool di test", settings.DB_NAME_TEST, in_uso)


# ===========================================================================
# PASSI DISCRIMINANTI -- TREDICI, uno per sede-passo. Tutti test DURI.
#
# SENTINEL_S6268_XFAIL_RIMOSSO -- Q-COPPIA-3=A. The eleven xfail(strict)
# markers were removed in the SAME session that repaired the five sites, as
# the STATO clause required, and only AFTER a run had shown all eleven going
# XPASS(strict) against the repaired router. Removing them any earlier would
# have turned a measurement into a claim.
#
# The eleven `reason` strings are NOT transcribed here. Everything measurable
# they carried -- site, correct value, broken value -- already lives in the
# fields of the Passo below, where SC-8 still reads it: `rotto` is what tells
# a regression to the KNOWN broken value apart from a regression to a
# different one. Copying those numbers into prose would open a second seat for
# a value that has one, and the copy is always the seat that goes stale.
#
# The twelfth step carries its own marker-removal note at its own site: it was
# freed one session earlier, by s.6.269.
# ===========================================================================
def test_s346_saltata_intra_giorno(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, owner_id = seed_owner_test
    passi = _seq_sc1(
        client, token, owner_id, insert_test_farmaco, db_test_pool
    )
    _esigi("SC-1.1", passi["SC-1.1"])


def test_s546_undo_intra_giorno(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, owner_id = seed_owner_test
    passi = _seq_sc1(
        client, token, owner_id, insert_test_farmaco, db_test_pool
    )
    _esigi("SC-1.2", passi["SC-1.2"])


def test_s696_recupero_su_base_falsa(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, owner_id = seed_owner_test
    passi = _seq_sc1(
        client, token, owner_id, insert_test_farmaco, db_test_pool
    )
    _esigi("SC-1.3", passi["SC-1.3"])


def test_s346_saltata_cross_midnight(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, owner_id = seed_owner_test
    passi = _seq_sc1b(
        client, token, owner_id, insert_test_farmaco, db_test_pool
    )
    _esigi("SC-1b.1", passi["SC-1b.1"])


def test_s546_undo_cross_midnight(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, owner_id = seed_owner_test
    passi = _seq_sc1b(
        client, token, owner_id, insert_test_farmaco, db_test_pool
    )
    _esigi("SC-1b.2", passi["SC-1b.2"])


def test_s696_recupero_pavimento_cross_midnight(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, owner_id = seed_owner_test
    passi = _seq_sc1b(
        client, token, owner_id, insert_test_farmaco, db_test_pool
    )
    _esigi("SC-1b.3", passi["SC-1b.3"])


def test_s443_sospesa(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, owner_id = seed_owner_test
    passi = _seq_sc2(
        client, token, owner_id, insert_test_farmaco, db_test_pool
    )
    _esigi("SC-2.1", passi["SC-2.1"])


def test_s154_presa_ramo_update(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, owner_id = seed_owner_test
    passi = _seq_sc3(
        client, token, owner_id, insert_test_farmaco, db_test_pool
    )
    _esigi("SC-3.1", passi["SC-3.1"])


def test_s205_ricalcolo_totale_residuo(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, owner_id = seed_owner_test
    passi = _seq_sc4(
        client, token, owner_id, insert_test_farmaco, db_test_pool
    )
    _esigi("SC-4.1", passi["SC-4.1"])


def test_s696_reset_direzione_opposta(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, owner_id = seed_owner_test
    passi = _seq_sc4(
        client, token, owner_id, insert_test_farmaco, db_test_pool
    )
    _esigi("SC-4.2", passi["SC-4.2"])


def test_s696_punto_zero_su_base_falsa(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, owner_id = seed_owner_test
    passi = _seq_sc5(
        client, token, owner_id, insert_test_farmaco, db_test_pool
    )
    _esigi("SC-5.1", passi["SC-5.1"])


# SENTINEL_S6268_PASSO_UNDO_VIVO -- Q-COPPIA-6=A. The thirteenth step, minted
# by the mutation collaudo of the fix and not by the original measurement: it
# is the only one that reaches the /undo restore with a total still live.
def test_s546_undo_su_totale_vivo(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, owner_id = seed_owner_test
    passi = _seq_sc9(
        client, token, owner_id, insert_test_farmaco, db_test_pool
    )
    _esigi("SC-9.1", passi["SC-9.1"])


# SENTINEL_S6269_XFAIL_RIMOSSO -- Q-QBIS-1=A. Marker removed in the SAME
# session that repaired the site, as the STATO clause requires. From here on
# this is a HARD test: if the guard is dropped, SC-7.1 measures
# (201, 'ricalcolata', True), stops matching `corretto`, and there is no xfail
# left to swallow it. The function NAME is historical -- it names the defect
# the step was minted for and is kept so the Changelog references hold.
def test_n3_stato_destinazione_non_controllato(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    token, owner_id = seed_owner_test
    passi = _seq_sc7(
        client, token, owner_id, insert_test_farmaco, db_test_pool
    )
    _esigi("SC-7.1", passi["SC-7.1"])


# ===========================================================================
# SC-6 -- CONTROLLO POSITIVO su :578. Test DURO, mai xfail.
# ===========================================================================
def test_sc6_controllo_positivo_rollback_d_plus_one(
    client, seed_owner_test, insert_test_farmaco, db_test_pool
) -> None:
    """The one site that writes both columns in the same UPDATE.

    Expected to hold whether the pair is guarded or not. If this fails the file
    is measuring its own noise and every other outcome must be discarded.
    """
    token, owner_id = seed_owner_test
    atteso, misurato = _seq_sc6(
        client, token, owner_id, insert_test_farmaco, db_test_pool
    )
    _controllo("SC-6", ":578 rollback D+1", atteso, misurato)


# ===========================================================================
# SC-8 -- GUARDIA DI COPERTURA. Deve restare LULTIMA funzione del file.
# ===========================================================================
def test_sc8_copertura() -> None:
    """Asserts COVERAGE and, for nonconforming steps, the SHAPE of the known
    defect. Never conformity: green today, green after the fix.

    This is what makes xfail safe. xfail swallows any exception, so a setup
    that breaks is indistinguishable from the defect being present: the test
    would go xfailed and the suite would stay quiet. A broken setup, however,
    never reaches _esigi, so its step never registers and the count falls short
    here -- and this test is not xfail.

    It also fails loudly on a partial run instead of printing a reassuring OK.
    That failure mode -- an echo declaring OK on a scenario never executed --
    is the one LC-106 was minted for.
    """
    disc = {k: v for k, v in _REGISTRO.items() if v["tipo"] == "DISCRIMINANTE"}
    ctrl = {k: v for k, v in _REGISTRO.items() if v["tipo"] == "CONTROLLO"}

    print("\n=== INVARIANTE DI COPPIA -- QUADRO ===")
    for chiave in sorted(_REGISTRO):
        v = _REGISTRO[chiave]
        stato = "CONFORME" if v["conforme"] else "DIFFORME"
        print(
            f"{chiave:<10} {v['tipo']:<14} {stato:<9} {v['sede']}\n"
            f"{'':<10} corretto={v['corretto']!r}\n"
            f"{'':<10} rotto   ={v['rotto']!r}\n"
            f"{'':<10} misurato={v['misurato']!r}"
        )
    n_conf = sum(1 for v in disc.values() if v["conforme"])
    print(
        f"--- discriminanti {len(disc)}: conformi {n_conf}, "
        f"difformi {len(disc) - n_conf}; controlli {len(ctrl)} ---"
    )

    assert len(ctrl) == _CONTROLLI_ATTESI, (
        f"controlli registrati {len(ctrl)}, attesi {_CONTROLLI_ATTESI}: "
        "copertura incompleta, nessuna conclusione."
    )
    assert len(disc) == _PASSI_DISCRIMINANTI_ATTESI, (
        f"passi discriminanti registrati {len(disc)}, attesi "
        f"{_PASSI_DISCRIMINANTI_ATTESI}: copertura incompleta. Un setup rotto "
        "e indistinguibile dal difetto sotto xfail: questa e la sede in cui "
        "diventa visibile."
    )

    # SENTINEL_S6268_SC8_INDURIMENTO -- Q-QUATER-3=A.
    #
    # Closes HALF of limit 1. A defect that changes SHAPE inside a site listed
    # here is not intercepted by xfail, which swallows any failure whatever its
    # cause. Here it is a hard red. A step that has become CONFORME is not in
    # this set, so the arrival of the fix does not trip it.
    #
    # The message is DIAGNOSTIC by mandate: the session that reads it is the
    # one repairing the sites, and a gate that only says "difforme" forces a
    # second run to learn anything.
    difformi = {k: v for k, v in disc.items() if not v["conforme"]}
    deviati = {
        k: v for k, v in difformi.items() if v["misurato"] != v["rotto"]
    }
    if deviati:
        righe = "\n".join(
            f"  {k} ({v['sede']})\n"
            f"      rotto dichiarato = {v['rotto']!r}\n"
            f"      misurato         = {v['misurato']!r}"
            for k, v in sorted(deviati.items())
        )
        raise AssertionError(
            f"{len(deviati)} passo/i difforme/i NON combacia/no col proprio "
            "valore rotto dichiarato. Il difetto ha cambiato forma in una sede "
            "censita, oppure il valore dichiarato e stantio.\n"
            f"{righe}\n"
            "NON e un fix e NON e il difetto noto: fermarsi e verbalizzare."
        )
