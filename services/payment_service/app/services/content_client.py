import httpx

from app.settings import CONTENT_SERVICE_URL


async def get_movie(movie_id: int) -> dict | None:
    url = f"{CONTENT_SERVICE_URL}/api/v1/movies/{movie_id}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()
        if isinstance(data, dict):
            return data
    return None
