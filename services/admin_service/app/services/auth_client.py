import os
import httpx
from typing import Any, Dict, Optional

AUTH_BASE = os.getenv("AUTH_BASE", "http://auth_service:8000")
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET") or os.getenv("AUTH_INTERNAL_SECRET") or ""

def _headers() -> Dict[str, str]:
    # send BOTH header casings just in case validator is strict
    return {
        "x-internal-secret": INTERNAL_SECRET,
        "X-Internal-Secret": INTERNAL_SECRET,
    }

def _clean(params: Dict[str, Optional[object]]) -> Dict[str, object]:
    out: Dict[str, object] = {}
    for k, v in params.items():
        if v is None:
            continue
        if isinstance(v, str) and v.strip() == "":
            continue
        out[k] = v
    return out

async def get_users(query: Optional[str], role: Optional[str], is_blocked: Optional[bool], limit: int, offset: int) -> Any:
    params = _clean({
        "query": query,
        "role": role,
        "is_blocked": is_blocked,
        "limit": limit,
        "offset": offset,
    })
    async with httpx.AsyncClient(base_url=AUTH_BASE, timeout=15.0) as client:
        r = await client.get("/internal/users", params=params, headers=_headers())
        r.raise_for_status()
        return r.json()

async def get_user(user_id: int) -> Any:
    async with httpx.AsyncClient(base_url=AUTH_BASE, timeout=15.0) as client:
        r = await client.get(f"/internal/users/{user_id}", headers=_headers())
        r.raise_for_status()
        return r.json()

async def update_user(user_id: int, payload: Dict[str, Any]) -> Any:
    async with httpx.AsyncClient(base_url=AUTH_BASE, timeout=15.0) as client:
        r = await client.patch(f"/internal/users/{user_id}", json=payload, headers=_headers())
        r.raise_for_status()
        return r.json()
