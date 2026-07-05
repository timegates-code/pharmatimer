"""ANOM-1 (par.196): unit tests for bounded retry in get_connection().

Validates exponential backoff + jitter on PoolError and re-raise after the
configured number of attempts. _pool, time.sleep and random.uniform are mocked
so tests are deterministic and fast (no DB, no real sleeping).
"""
from unittest.mock import MagicMock, patch

import pytest
from mysql.connector.errors import PoolError

from pharmatimer_api.db import connection


def test_retry_succeeds_after_transient_pool_errors():
    """PoolError on the first two acquires, success on the third -> returns conn."""
    fake_conn = object()
    fake_pool = MagicMock()
    fake_pool.get_connection.side_effect = [
        PoolError("Failed getting connection; pool exhausted"),
        PoolError("Failed getting connection; pool exhausted"),
        fake_conn,
    ]
    with patch.object(connection, "_pool", fake_pool), patch.object(
        connection.time, "sleep"
    ) as mock_sleep, patch.object(connection.random, "uniform", return_value=0.0):
        result = connection.get_connection()

    assert result is fake_conn
    assert fake_pool.get_connection.call_count == 3
    assert mock_sleep.call_count == 2
    delays = [c.args[0] for c in mock_sleep.call_args_list]
    assert delays == [
        connection.POOL_ACQUIRE_BASE_DELAY_S,
        connection.POOL_ACQUIRE_BASE_DELAY_S * 2,
    ]


def test_retry_reraises_after_max_attempts():
    """PoolError on every acquire -> re-raises PoolError after MAX attempts."""
    fake_pool = MagicMock()
    fake_pool.get_connection.side_effect = PoolError(
        "Failed getting connection; pool exhausted"
    )
    with patch.object(connection, "_pool", fake_pool), patch.object(
        connection.time, "sleep"
    ) as mock_sleep, patch.object(connection.random, "uniform", return_value=0.0):
        with pytest.raises(PoolError):
            connection.get_connection()

    assert (
        fake_pool.get_connection.call_count
        == connection.POOL_ACQUIRE_MAX_ATTEMPTS
    )
    assert mock_sleep.call_count == connection.POOL_ACQUIRE_MAX_ATTEMPTS - 1


def test_first_attempt_success_no_sleep():
    """Connection available immediately -> single acquire, no sleep."""
    fake_conn = object()
    fake_pool = MagicMock()
    fake_pool.get_connection.return_value = fake_conn
    with patch.object(connection, "_pool", fake_pool), patch.object(
        connection.time, "sleep"
    ) as mock_sleep:
        result = connection.get_connection()

    assert result is fake_conn
    assert fake_pool.get_connection.call_count == 1
    assert mock_sleep.call_count == 0
