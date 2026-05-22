"""
PharmaTimer F3-S1-bis Step 4 CP1-code
GET /api/health endpoint (no-auth public).
Returns service status + DB reachability + version.
"""
from fastapi import APIRouter

from pharmatimer_api.db.connection import db_ping

router = APIRouter(prefix="/api", tags=["health"])

VERSION = "0.1.0"


@router.get("/health")
def health() -> dict[str, str]:
    """No-auth liveness endpoint. Includes DB ping outcome."""
    db_status = "reachable" if db_ping() else "unreachable"
    return {
        "status": "ok",
        "db": db_status,
        "version": VERSION,
    }
