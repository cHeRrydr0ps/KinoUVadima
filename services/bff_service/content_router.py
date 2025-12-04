from fastapi import APIRouter, Request, Response
import os, httpx

router = APIRouter(prefix="/api/content", tags=["content-proxy"])

CONTENT_BASE = os.getenv("CONTENT_SERVICE_URL", "http://content_service:8000")

def _join(*parts: str) -> str:
    result = "/".join(s.strip("/") for s in parts if s and s.strip("/"))
    # Fix protocol separator
    if "http:" in result and "://" not in result:
        result = result.replace("http:", "http://")
    elif "https:" in result and "://" not in result:
        result = result.replace("https:", "https://")
    return result

async def _proxy(request: Request, method: str, path: str):
    # Простое и правильное формирование URL
    url = CONTENT_BASE.rstrip("/") + "/" + path.lstrip("/")
    headers = dict(request.headers)
    # cleanup hop-by-hop headers
    for h in ["host", "content-length"]:
        headers.pop(h, None)

    params = dict(request.query_params)
    body = await request.body()

    async with httpx.AsyncClient(follow_redirects=True) as client:
        r = await client.request(method, url, headers=headers, params=params, content=body)
        content_type = r.headers.get("content-type", "application/json")
        return Response(content=r.content, status_code=r.status_code, media_type=content_type)

@router.get("/movies/")
async def movies_list(request: Request):
    """Get list of movies from content service"""
    return await _proxy(request, "GET", "api/v1/movies")  # Добавляем правильный префикс

@router.get("/movies/{movie_id}")
async def movie_detail(movie_id: int, request: Request):
    """Get movie details by ID from content service"""
    return await _proxy(request, "GET", f"api/v1/movies/{movie_id}")

@router.get("/genres/")
async def genres_list(request: Request):
    """Get list of genres from content service"""
    return await _proxy(request, "GET", "api/v1/genres")

@router.get("/movies/{movie_id}/genres/")
async def movie_genres(movie_id: int, request: Request):
    """Get genres for specific movie from content service"""
    return await _proxy(request, "GET", f"api/v1/movies/{movie_id}/genres")
