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


def test_settings_vapid_facoltative_mai_validate(monkeypatch):
    """Decision 15: the VAPID settings are optional and never validated at startup.

    Without them, or with values that cannot work, Settings still builds: the
    channel goes off and says so, the app starts anyway. Pinned in
    scripts/audit/mutazioni.py.
    """
    monkeypatch.delenv("VAPID_PEM_FILE", raising=False)
    monkeypatch.delenv("VAPID_SUB", raising=False)
    s = _fresh_settings(monkeypatch, DB_NAME="anydb", DB_USER="u", DB_PASSWORD="p")
    assert s.VAPID_PEM_FILE is None
    assert s.VAPID_SUB is None
    s = _fresh_settings(
        monkeypatch,
        DB_NAME="anydb",
        DB_USER="u",
        DB_PASSWORD="p",
        VAPID_PEM_FILE="/percorso/che/non/esiste.pem",
        VAPID_SUB="non-un-sub",
    )
    assert s.VAPID_PEM_FILE == "/percorso/che/non/esiste.pem"
    assert s.VAPID_SUB == "non-un-sub"


def test_settings_monitor_facoltativo_mai_validato(monkeypatch):
    """Decision 1 of 2026-11-13: MONITOR_URL is optional and never validated at startup.

    Like the VAPID settings: a value that cannot work must not stop the API
    or the planner at import, and a validation error would print it. The
    heartbeat says what is wrong instead (pharmatimer_api.monitor). Pinned in
    scripts/audit/mutazioni.py.
    """
    monkeypatch.delenv("MONITOR_URL", raising=False)
    s = _fresh_settings(monkeypatch, DB_NAME="anydb", DB_USER="u", DB_PASSWORD="p")
    assert s.MONITOR_URL is None
    s = _fresh_settings(
        monkeypatch, DB_NAME="anydb", DB_USER="u", DB_PASSWORD="p", MONITOR_URL="non-un-indirizzo"
    )
    assert s.MONITOR_URL == "non-un-indirizzo"


def test_settings_chiave_sconosciuta_del_file_ignorata(monkeypatch, tmp_path):
    """A key of the env file that Settings does not know is ignored, never refused.

    It is extra="ignore" of model_config. The order of a deploy rests on it:
    the Mini's .env.dev may carry a key before the code that reads it, as
    MONITOR_URL before the deploy that brings it. Pinned in
    scripts/audit/mutazioni.py.
    """
    for k in ("DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME", "DB_NAME_TEST",
              "DB_DEFAULTS_FILE", "CHIAVE_CHE_LA_CONFIGURAZIONE_NON_CONOSCE"):
        monkeypatch.delenv(k, raising=False)
    file_env = tmp_path / ".env.prova"
    file_env.write_text(
        "DB_NAME=anydb\nDB_USER=u\nDB_PASSWORD=p\nCHIAVE_CHE_LA_CONFIGURAZIONE_NON_CONOSCE=1\n",
        encoding="utf-8",
    )
    from pharmatimer_api.config import Settings
    s = Settings(_env_file=str(file_env))
    assert s.DB_NAME == "anydb"
    assert not hasattr(s, "CHIAVE_CHE_LA_CONFIGURAZIONE_NON_CONOSCE")
