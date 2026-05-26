"""
PharmaTimer F3-S1-bis Step 4 + N+5.M-pivot-exec-beta-1
Tests for Settings model_validator cross-field validation (Q-I.1=(b)+Q-I.3=(b)).

SENTINEL_N5M_PIVOT_EXEC_BETA1_BACKEND_REFACTOR_APPLIED
"""
from __future__ import annotations

import pytest
from pydantic import ValidationError


def _fresh_settings(monkeypatch, **env_vars):
    """Instantiate Settings with isolated env: clear DB_* envs, then apply test envs.

    _env_file=None disables .env.dev auto-loading so tests are hermetic.
    """
    monkeypatch.delenv("DB_HOST", raising=False)
    monkeypatch.delenv("DB_PORT", raising=False)
    monkeypatch.delenv("DB_USER", raising=False)
    monkeypatch.delenv("DB_PASSWORD", raising=False)
    monkeypatch.delenv("DB_NAME", raising=False)
    monkeypatch.delenv("DB_NAME_TEST", raising=False)
    monkeypatch.delenv("DB_DEFAULTS_FILE", raising=False)
    for k, v in env_vars.items():
        monkeypatch.setenv(k, v)
    from pharmatimer_api.config import Settings
    return Settings(_env_file=None)


def test_settings_neither_credentials_nor_defaults_file_raises(monkeypatch):
    """No DB_USER/DB_PASSWORD and no DB_DEFAULTS_FILE -> ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        _fresh_settings(monkeypatch, DB_NAME="anydb")
    assert "DB credentials required" in str(exc_info.value)


def test_settings_defaults_file_only_ok(monkeypatch):
    """DB_DEFAULTS_FILE set, no DB_USER/DB_PASSWORD -> OK (prod Mini mode)."""
    s = _fresh_settings(
        monkeypatch,
        DB_NAME="pharmatimer",
        DB_DEFAULTS_FILE="/Users/marketreader/.my-pharmatimer.cnf",
    )
    assert s.DB_DEFAULTS_FILE == "/Users/marketreader/.my-pharmatimer.cnf"
    assert s.DB_USER is None
    assert s.DB_PASSWORD is None


def test_settings_user_password_only_ok(monkeypatch):
    """DB_USER+DB_PASSWORD set, no DB_DEFAULTS_FILE -> OK (dev Studio mode)."""
    s = _fresh_settings(
        monkeypatch,
        DB_NAME="pharmatimer_dev",
        DB_USER="pharmatimer",
        DB_PASSWORD="devsecret",
    )
    assert s.DB_USER == "pharmatimer"
    assert s.DB_PASSWORD == "devsecret"
    assert s.DB_DEFAULTS_FILE is None


def test_settings_db_name_missing_raises(monkeypatch):
    """DB_NAME unset -> ValidationError regardless of credentials mode."""
    with pytest.raises(ValidationError) as exc_info:
        _fresh_settings(
            monkeypatch,
            DB_USER="pharmatimer",
            DB_PASSWORD="devsecret",
        )
    assert "DB_NAME is required" in str(exc_info.value)
