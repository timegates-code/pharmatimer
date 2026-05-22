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
from pharmatimer_api.routers import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_pool()
    yield
    # Shutdown
    close_pool()


app = FastAPI(
    title="PharmaTimer API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
