"""
PharmaTimer F3-S1-bis Step 4 CP1-code
FastAPI application entry point.
Lifespan: init mysql-connector pool at startup, close at shutdown.
CORS dev permissive (sub-AMB F3-S1.D); prod restrictive deferred F3-S6.
RepositoryError exception handler deferred CP3 (vocabulary mapping with router).
"""
import os
from contextlib import asynccontextmanager

# SENTINEL_N5M_PIVOT_EXEC_BETA2_ATTEMPT2_APP_VERSION_DYNAMIC
# F3-S6 N+5.M-pivot-exec-beta-2-attempt-2: dynamic version from package metadata.
# Mini editable install -> real version (e.g. "0.7.0").
# Studio venv non-editable -> fallback "0.0.0-dev" (drift-N45 carry-forward
# par.22.98/22.99, Lesson #31 strong applicazione).
from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as _pkg_version

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from pharmatimer_api.config import settings
from pharmatimer_api.db.connection import close_pool, init_pool
from pharmatimer_api.exceptions import RepositoryError, repository_error_handler
from pharmatimer_api.routers import (  # CP1 F3-S4-alpha N+5.E-alpha applied SENTINEL
    farmaci,
    health,
    log_assunzioni,
    orari,
    utenti,
)

try:
    __version__ = _pkg_version("pharmatimer-api")
except PackageNotFoundError:
    __version__ = "0.0.0-dev"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_pool()
    yield
    # Shutdown
    close_pool()


app = FastAPI(
    title="PharmaTimer API",
    version=__version__,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CP3 F3-S1-bis-delta: exception handler + farmaci router
app.add_exception_handler(RepositoryError, repository_error_handler)

app.include_router(health.router)
app.include_router(farmaci.router)
app.include_router(orari.router)
app.include_router(log_assunzioni.router)
app.include_router(utenti.router)

# SENTINEL_N5E_BETA_CP1_APP_INCLUDE_PERMESSI
# F3-S4-beta N+5.E-beta CP1 -- CRUD permessi caregiver
from pharmatimer_api.routers import permessi as _permessi_module  # noqa: E402

app.include_router(_permessi_module.router)

# SENTINEL_N5QC_CP1_STATIC_SERVE -- Q-W.5 Pattern A static-serve PWA prod (Arch-1/A1-fastapi).
# Registrato DOPO tutti i router /api/*. Guard isdir: auto-disabilitato
# se la web dir non esiste (Studio dev/test invariati, pytest 80).
_WEB_DIR = os.path.normpath(
    os.environ.get("PHARMATIMER_WEB_DIR", "/Users/marketreader/PharmaTimer/web")
)
if os.path.isdir(_WEB_DIR):
    _assets_dir = os.path.join(_WEB_DIR, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def _serve_spa(full_path: str):
        # SENTINEL_N5R_CP1_API_PREFIX_GUARD -- F-3: /api/* non deve cadere nel catch-all SPA.
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = os.path.normpath(os.path.join(_WEB_DIR, full_path))
        if (
            full_path
            and candidate.startswith(_WEB_DIR + os.sep)
            and os.path.isfile(candidate)
        ):
            return FileResponse(candidate)
        return FileResponse(os.path.join(_WEB_DIR, "index.html"))
