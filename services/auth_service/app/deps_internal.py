import os
from fastapi import Header, HTTPException, status, Request

INTERNAL_SECRET_EXPECTED = os.getenv("INTERNAL_SECRET") or os.getenv("AUTH_INTERNAL_SECRET") or ""

async def require_internal_secret(
    request: Request,
    x_internal_secret: str | None = Header(None, alias="x-internal-secret"),
) -> None:
    # Fallback to any casing from headers (FastAPI is case-insensitive, но на всякий продублируем)
    provided = x_internal_secret or request.headers.get("X-Internal-Secret") or request.headers.get("x-internal-secret")
    expected = INTERNAL_SECRET_EXPECTED
    if not expected:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Internal access disabled")
    if provided != expected:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
