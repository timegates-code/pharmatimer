"""Pins of the dependency check -- scripts/audit/dipendenze.py.

backend/requirements.lock is the one source of the runtime versions: the Studio
and the Mini install it in hash mode (deploy/installa-dal-lock.sh), and make
check and make prod-check measure that each venv carries it. The check compares
versions; the artifact hashes are pip's job at install time.

Both directions, on texts built here and never on the real venv:
  - a freeze that carries the lock, with extra packages and with a name spelled
    differently (pydantic_core against pydantic-core), is green. A check that
    were always red would be a gate always closed;
  - a lock entry installed at another version is red, and is named;
  - a lock entry missing from the venv is red, and is named;
  - a lock line that is not name==version is not measurable, never skipped.

Rows in scripts/audit/mutazioni.py: the version comparison switched off must
turn the version pin red; the missing check switched off must turn the missing
pin red. Each row leaves the other path on.

This file lives in backend/tests for the reason test_g21_livello.py does: the
mutation bench runs pytest and vitest only.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

_AUDIT = Path(__file__).resolve().parents[2] / "scripts" / "audit"
_SPEC = importlib.util.spec_from_file_location("dipendenze", _AUDIT / "dipendenze.py")
_DIP = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_DIP)

_LOCK = (
    "# a generated header\n"
    "pydantic-core==2.46.4 --hash=sha256:" + "a" * 64 + "\n"
    "starlette==1.1.0 --hash=sha256:" + "b" * 64 + "\n"
)


def _compare(freeze: str):
    return _DIP.confronta(_DIP.leggi_lock(_LOCK), _DIP.leggi_freeze(freeze))


def test_freeze_carrying_the_lock_is_green_with_extras() -> None:
    missing, different, extra = _compare(
        "pydantic_core==2.46.4\nstarlette==1.1.0\npytest==9.0.3\n-e /somewhere/backend\n"
    )
    assert (missing, different) == ([], [])
    assert extra == ["pytest"]


def test_version_other_than_the_lock_is_red() -> None:
    missing, different, _extra = _compare("pydantic_core==2.46.4\nstarlette==1.0.0\n")
    assert missing == []
    assert different == [("starlette", "1.1.0", "1.0.0")]


def test_entry_missing_from_the_venv_is_red() -> None:
    missing, different, _extra = _compare("starlette==1.1.0\n")
    assert missing == ["pydantic-core"]
    assert different == []


def test_unreadable_lock_line_is_not_measurable() -> None:
    with pytest.raises(_DIP.NonMisurabile):
        _DIP.leggi_lock("starlette>=1.0\n")
