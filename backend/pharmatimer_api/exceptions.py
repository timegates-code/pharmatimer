"""
PharmaTimer F3-S1-bis-delta CP3
RepositoryError vocabulary aligned with PWA RepositoryError.js (par.22.34).
Maps backend exceptions to HTTP responses with code+severity body shape.

Body shape (Q1=a par.11.D-S1.bis-cont-2):
    {"error": {"code": "...", "severity": "...", "message": "..."}}

Code -> HTTP status mapping (Q2=a):
    DB_UNAVAILABLE -> 503
    NOT_FOUND -> 404
    CONSTRAINT_VIOLATION -> 409
    GENERIC -> 500
"""
from enum import Enum
from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse


class RepositoryErrorCode(str, Enum):
    DB_UNAVAILABLE = "DB_UNAVAILABLE"
    NOT_FOUND = "NOT_FOUND"
    CONSTRAINT_VIOLATION = "CONSTRAINT_VIOLATION"
    FORBIDDEN = "FORBIDDEN"  # CP1 F3-S4-alpha N+5.E-alpha applied SENTINEL
    UNAUTHORIZED = "UNAUTHORIZED"  # SENTINEL_N5K_CP1_EXCEPTIONS_UNAUTHORIZED_ENUM N+5.K cluster auth-layer fix
    GENERIC = "GENERIC"


class RepositoryErrorSeverity(str, Enum):
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


_DEFAULT_SEVERITY = {
    RepositoryErrorCode.DB_UNAVAILABLE: RepositoryErrorSeverity.CRITICAL,
    RepositoryErrorCode.NOT_FOUND: RepositoryErrorSeverity.WARNING,
    RepositoryErrorCode.CONSTRAINT_VIOLATION: RepositoryErrorSeverity.WARNING,
    RepositoryErrorCode.FORBIDDEN: RepositoryErrorSeverity.WARNING,
    RepositoryErrorCode.UNAUTHORIZED: RepositoryErrorSeverity.ERROR,  # SENTINEL_N5K_CP1_EXCEPTIONS_UNAUTHORIZED_SEVERITY drift-N54 par.22.91 ratifica Opzione A
    RepositoryErrorCode.GENERIC: RepositoryErrorSeverity.ERROR,
}

_HTTP_STATUS = {
    RepositoryErrorCode.DB_UNAVAILABLE: 503,
    RepositoryErrorCode.NOT_FOUND: 404,
    RepositoryErrorCode.CONSTRAINT_VIOLATION: 409,
    RepositoryErrorCode.FORBIDDEN: 403,
    RepositoryErrorCode.UNAUTHORIZED: 401,  # SENTINEL_N5K_CP1_EXCEPTIONS_UNAUTHORIZED_HTTP_STATUS
    RepositoryErrorCode.GENERIC: 500,
}


class RepositoryError(Exception):
    """Backend repository error with code + severity vocabulary.

    Mirrors PWA-side RepositoryError.js (par.22.34) for symmetric ApiRepository swap.
    """

    def __init__(
        self,
        code: RepositoryErrorCode,
        message: str,
        severity: Optional[RepositoryErrorSeverity] = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.severity = severity or _DEFAULT_SEVERITY[code]


async def repository_error_handler(request: Request, exc: RepositoryError) -> JSONResponse:
    """Global handler mapping RepositoryError to vocabulary-shaped JSONResponse."""
    return JSONResponse(
        status_code=_HTTP_STATUS[exc.code],
        content={
            "error": {
                "code": exc.code.value,
                "severity": exc.severity.value,
                "message": exc.message,
            }
        },
    )
