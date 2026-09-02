"""CP1 tests (F-3): the SPA catch-all must not shadow /api/* with index.html.

S1: GET /api/utenti (path exists, POST-only) -> 404 JSON, not text/html.
S2: GET /api/inesistente -> 404 JSON, not text/html.
S3 (no-regression): GET / and GET /deeplink/spa -> index.html (200);
    GET /assets/<file> -> 200; POST /api/utenti still handled by the router
    (not swallowed by the catch-all -> not a catch-all 404).

The app mounts the SPA catch-all only when PHARMATIMER_WEB_DIR is a real dir,
so we build a temp web dir and import the app fresh under that env. TestClient
is used WITHOUT a context manager to avoid lifespan pool re-init (Lesson #19).
"""

import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    web_dir = tmp_path / "web"
    assets_dir = web_dir / "assets"
    assets_dir.mkdir(parents=True)
    (web_dir / "index.html").write_text(
        "<!doctype html><html><body><div id='root'></div></body></html>",
        encoding="utf-8",
    )
    (assets_dir / "index-test.js").write_text("export const x = 1;\n", encoding="utf-8")

    monkeypatch.setenv("PHARMATIMER_WEB_DIR", str(web_dir))

    # Re-import the app module so the module-level mount/catch-all picks up the
    # temp web dir (the guard is evaluated at import time).
    import pharmatimer_api.app as app_module

    app_module = importlib.reload(app_module)
    return TestClient(app_module.app)


def _is_html(response):
    return "text/html" in response.headers.get("content-type", "")


def test_s1_api_method_mismatch_not_html(client):
    resp = client.get("/api/utenti")
    assert resp.status_code == 404, resp.text
    assert not _is_html(resp), "GET /api/utenti must not be served as index.html"


def test_s2_api_unknown_path_not_html(client):
    resp = client.get("/api/inesistente")
    assert resp.status_code == 404, resp.text
    assert not _is_html(resp), "unknown /api path must not be served as index.html"


def test_s3a_root_serves_index(client):
    resp = client.get("/")
    assert resp.status_code == 200, resp.text
    assert _is_html(resp)
    assert "id='root'" in resp.text


def test_s3b_spa_deeplink_serves_index(client):
    resp = client.get("/deeplink/spa")
    assert resp.status_code == 200, resp.text
    assert _is_html(resp)
    assert "id='root'" in resp.text


def test_s3c_assets_served(client):
    resp = client.get("/assets/index-test.js")
    assert resp.status_code == 200, resp.text
    assert not _is_html(resp)


def test_s3d_post_utenti_reaches_router_not_catchall(client):
    # No X-User-Token -> the utenti router/auth answers (401/403/422),
    # NOT a catch-all 404 and NOT index.html. The point: routing is intact.
    resp = client.post("/api/utenti", json={})
    assert resp.status_code != 404, resp.text
    assert not _is_html(resp)
