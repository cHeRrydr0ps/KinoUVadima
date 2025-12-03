
from fastapi import APIRouter, Request, Response
import os, json, httpx
from typing import Dict, Any

router = APIRouter(prefix="/api/admin", tags=["admin-proxy"])

ADMIN_BASE = os.getenv("ADMIN_SERVICE_URL", "http://admin_service:8000")

def _join(*parts: str) -> str:
    return "/".join(s.strip("/")
                    for s in parts if s is not None).replace(":/", "://")

async def _proxy(request: Request, method: str, path: str):
    url = _join(ADMIN_BASE, path)
    headers = dict(request.headers)
    # cleanup hop-by-hop headers
    for h in ["host", "content-length"]:
        headers.pop(h, None)

    cookies = request.cookies
    params = dict(request.query_params)
    body = await request.body()

    async with httpx.AsyncClient(follow_redirects=True) as client:
        r = await client.request(method, url, headers=headers, params=params, content=body, cookies=cookies)
        content_type = r.headers.get("content-type", "application/json")
        return Response(content=r.content, status_code=r.status_code, media_type=content_type)

@router.get("/genres/")
async def genres(request: Request):
    return await _proxy(request, "GET", "/admin/genres/")

@router.get("/movies/")
async def movies_list(request: Request):
    return await _proxy(request, "GET", "/admin/movies/")

@router.get("/movies/{movie_id}")
async def movie_detail(movie_id: int, request: Request):
    headers = dict(request.headers)
    # cleanup hop-by-hop headers
    for h in ["host", "content-length"]:
        headers.pop(h, None)
    headers['Accept'] = 'application/json'
    headers['Content-Type'] = 'application/json'
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        # Получаем данные о фильме
        movie_url = _join(ADMIN_BASE, f"/admin/movies/{movie_id}")
        movie_response = await client.get(movie_url, headers=headers, cookies=request.cookies)
        
        if not movie_response.is_success:
            return Response(
                content=movie_response.content,
                status_code=movie_response.status_code,
                media_type=movie_response.headers.get('content-type', 'application/json')
            )
            
        movie_data = movie_response.json()
        
        # Получаем жанры фильма
        genres_url = _join(ADMIN_BASE, f"/admin/movies/{movie_id}/genres")
        genres_response = await client.get(genres_url, headers=headers, cookies=request.cookies)
        
        if genres_response.is_success:
            genres_data = genres_response.json()
            # Добавляем и ID жанров, и сами жанры в ответ
            movie_data['genres'] = genres_data
            movie_data['genre_ids'] = [g.get('genre_id', g.get('id')) for g in genres_data if g.get('genre_id') or g.get('id')]
        
        return Response(
            content=json.dumps(movie_data),
            status_code=200,
            media_type='application/json'
        )

@router.put("/movies/{movie_id}")
async def movie_update(movie_id: int, request: Request):
    return await _proxy(request, "PUT", f"/admin/movies/{movie_id}")

@router.delete("/movies/{movie_id}")
async def movie_delete(movie_id: int, request: Request):
    return await _proxy(request, "DELETE", f"/admin/movies/{movie_id}")
