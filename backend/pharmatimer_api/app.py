"""
PharmaTimer F3-S1-bis Step 4 CP1-code
FastAPI application entry point.
Lifespan: init mysql-connector pool at startup, close at shutdown.
CORS dev permissive (sub-AMB F3-S1.D); prod restrictive deferred F3-S6.
RepositoryError exception handler deferred CP3 (vocabulary mapping with router).
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pharmatimer_api.config import settings
from pharmatimer_api.db.connection import close_pool, init_pool
from pharmatimer_api.exceptions import RepositoryError, repository_error_handler
from pharmatimer_api.routers import farmaci, health, log_assunzioni, orari, utenti  # CP1 F3-S4-alpha N+5.E-alpha applied SENTINEL

# SENTINEL_N5M_PIVOT_EXEC_BETA2_ATTEMPT2_APP_VERSION_DYNAMIC
# F3-S6 N+5.M-pivot-exec-beta-2-attempt-2: dynamic version from package metadata.
# Mini editable install -> real version (e.g. "0.7.0").
# Studio venv non-editable -> fallback "0.0.0-dev" (drift-N45 carry-forward
# par.22.98/22.99, Lesson #31 strong applicazione).
from importlib.metadata import PackageNotFoundError, version as _pkg_version

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
