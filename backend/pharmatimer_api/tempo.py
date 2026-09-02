"""
PharmaTimer -- wall-clock plan, REAL-minute guards (decisione 2).

The database holds naive DATETIME values in the wall-clock zone the pilot
lives in: MySQL session tz = SYSTEM = CEST, measured on dev and prod
(src/domain/startBoundary.js, header). The plan lives in that wall clock and
the client reads it the same way (src/utils/time.js, wallToInstant). A guard
on the interval between two doses, though, must measure REAL minutes: on the
spring transition 23:00 -> 07:00 is 7 hours, on the autumn one 9.

PITFALL, MEASURED on python 3.13.12 and pinned by tests/test_intervallo_minimo:
two aware datetimes sharing the SAME tzinfo subtract NAIVELY -- the datetime
docs say the tzinfo is ignored and the naive difference returned -- so
23:00 -> 07:00 across the spring transition reads 480 instead of 420. The
instants are therefore converted to UTC before subtracting.

fold=0 on both operands: a wall time inside the double hour reads as its
FIRST occurrence, the reading the client makes too. A wall time inside the
skipped hour cannot reach this module as a tap (the clock never shows it) and
reaches it as a recalculated time only after the client has slid it.

FUSO_PARETE is a module constant and not a setting (P6=A): the pilot is one,
the DB zone is measured, and a knob nobody turns is a knob that drifts. The
declared limit: the server zone is fixed while the client reads the phone's;
a travelling patient makes the two diverge. Queue item, not solved here.

Pure module: no SQL, no I/O.
"""
from __future__ import annotations

from datetime import UTC, datetime
from zoneinfo import ZoneInfo

FUSO_PARETE = ZoneInfo("Europe/Rome")


def parete(dt: datetime) -> datetime:
    """Naive wall-clock form of `dt` in FUSO_PARETE.

    A naive input is already wall clock and is returned as is; an aware one
    is converted. This is the form the DATETIME columns hold and compare.
    """
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(FUSO_PARETE).replace(tzinfo=None)


def istante(dt: datetime) -> datetime:
    """Aware UTC instant of a wall-clock (naive) or aware datetime."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=FUSO_PARETE).astimezone(UTC)
    return dt.astimezone(UTC)


def minuti_reali(a: datetime, b: datetime) -> int:
    """Real minutes from `b` to `a`, positive when `a` is later, rounded."""
    return round((istante(a) - istante(b)).total_seconds() / 60)
