
from fastapi import APIRouter, Request, Response
import os, httpx
from urllib.parse import urljoin

# Example: http://admin_service:8000/admin
ADMIN_SERVICE_URL = os.getenv("ADMIN_SERVICE_URL", "http://admin_service:8000/admin").rstrip("/")

router = APIRouter(prefix="/api/admin", tags=["admin"])

async def _proxy(request: Request, subpath: str) -> Response:
    target = urljoin(ADMIN_SERVICE_URL + "/", subpath.lstrip("/"))
    headers = dict(request.headers)
    headers.pop("host", None)
    params = dict(request.query_params)
    body = await request.body()
    cookies = request.cookies

    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        r = await client.request(request.method, target, headers=headers, params=params, cookies=cookies, content=body)
    return Response(content=r.content, status_code=r.status_code, media_type=r.headers.get("content-type", "application/json"))

@router.api_route("/{subpath:path}", methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"])
async def passthrough(request: Request, subpath: str):
    return await _proxy(request, subpath)
