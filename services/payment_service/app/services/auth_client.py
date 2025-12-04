import httpx

from app.settings import AUTH_SERVICE_URL, INTERNAL_SECRET


async def get_user(user_id: int) -> dict:
    url = f"{AUTH_SERVICE_URL}/internal/users/{user_id}"
    headers = {
        "X-Internal-Secret": INTERNAL_SECRET,
        "x-internal-secret": INTERNAL_SECRET,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        return resp.json()


async def get_user_role(user_id: int) -> str | None:
    try:
        data = await get_user(user_id)
    except httpx.HTTPError:
        return None
    role = data.get("role") if isinstance(data, dict) else None
    if isinstance(role, str):
        return role.lower()
    return None
