"""
PharmaTimer F3-S1-bis-delta parte 2/2 CP4
Tests for GET /api/health (no-auth liveness endpoint).
Q-CP4.4=b: test_health_db_unreachable_handled skipped optional.
"""
from fastapi.testclient import TestClient


def test_health_no_auth_200(client: TestClient) -> None:
    """GET /api/health without auth returns 200 + status:ok + db:reachable + version."""
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["db"] == "reachable"
    assert body["version"] == "0.1.0"


def test_health_cors_preflight(client: TestClient) -> None:
    """OPTIONS /api/health with Origin localhost:5173 returns 200 + CORS headers."""
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    header_keys_lower = {k.lower() for k in response.headers.keys()}
    assert "access-control-allow-origin" in header_keys_lower
