
from fastapi import APIRouter, Request, Response
import os, httpx
from urllib.parse import urljoin

# Map legacy endpoints used by the frontend to the right services.

ADMIN_SERVICE_URL = os.getenv("ADMIN_SERVICE_URL", "http://admin_service:8000/admin").rstrip("/")
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth_service:8000").rstrip("/")

router = APIRouter(tags=["legacy"])

async def _forward(request: Request, base: str, path: str) -> Response:
    target = urljoin(base + "/", path.lstrip("/"))
    headers = dict(request.headers)
    headers.pop("host", None)
    params = dict(request.query_params)
    body = await request.body()
    cookies = request.cookies
    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        r = await client.request(request.method, target, headers=headers, params=params, cookies=cookies, content=body)
    return Response(content=r.content, status_code=r.status_code, media_type=r.headers.get("content-type", "application/json"))

# /api/offline-movies -> admin_service /admin/movies
@router.api_route("/api/offline-movies", methods=["GET"])
async def offline_movies(request: Request):
    return await _forward(request, ADMIN_SERVICE_URL, "movies")

# /api/users -> auth_service /internal/users
@router.api_route("/api/users", methods=["GET"])
async def users(request: Request):
    return await _forward(request, AUTH_SERVICE_URL, "internal/users")
