
# services/bff_service/tmdb_router.py
from fastapi import APIRouter, HTTPException, Query
import os, httpx
import logging

router = APIRouter()
logger = logging.getLogger("tmdb_router")

TMDB_BEARER = os.getenv("TMDB_BEARER") or os.getenv("TMDB_BEARER_TOKEN")
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE_URL = os.getenv("TMDB_BASE_URL", "https://api.themoviedb.org/3")

def _headers():
    h = {"Accept": "application/json"}
    if TMDB_BEARER:
        h["Authorization"] = f"Bearer {TMDB_BEARER}"
    return h

def _params(extra=None):
    p = {"language": "ru-RU"}  # change to en-US if needed
    if TMDB_API_KEY and not TMDB_BEARER:
        p["api_key"] = TMDB_API_KEY
    if extra:
        p.update(extra)
    return p

@router.get("/search")
async def search(q: str = Query(..., min_length=1)):
    url = f"{TMDB_BASE_URL}/search/movie"
    headers = _headers()
    params = _params({"query": q, "include_adult": "false"})
    
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url, headers=headers, params=params)
        r.raise_for_status()
        data = r.json()
        results = []
        for it in data.get("results") or []:
            results.append({
                "id": it.get("id"),
                "title": it.get("title"),
                "original_title": it.get("original_title"),
                "release_year": (it.get("release_date") or "")[:4],
            })
        return {"results": results}
    except httpx.RequestError as e:
        logger.warning('TMDB search network error: %s', e)
        return {'results': []}
    except httpx.HTTPStatusError as e:
        logger.warning('TMDB search HTTP error: %s', e)
        return {'results': []}
    except Exception as e:
        logger.error('TMDB search unexpected error: %s', e)
        return {'results': []}

@router.get("/movie/{tmdb_id}")
async def movie(tmdb_id: int):
    url = f"{TMDB_BASE_URL}/movie/{tmdb_id}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url, headers=_headers(), params=_params({"append_to_response": "videos"}))
        r.raise_for_status()
        m = r.json()
        trailer_url = None
        for v in ((m.get("videos") or {}).get("results") or []):
            if v.get("site") == "YouTube" and v.get("type") in ("Trailer", "Teaser"):
                trailer_url = f"https://www.youtube.com/watch?v={v.get('key')}"
                break
        poster_url = f"https://image.tmdb.org/t/p/w500{m['poster_path']}" if m.get("poster_path") else None
        countries = ", ".join([c.get("name") for c in (m.get("production_countries") or []) if c.get("name")])
        genres = [{"name": g.get("name")} for g in (m.get("genres") or [])]
        return {
            "title": m.get("title"),
            "original_title": m.get("original_title"),
            "overview": m.get("overview"),
            "release_year": (m.get("release_date") or "")[:4],
            "runtime": m.get("runtime"),
            "vote_average": m.get("vote_average"),
            "poster_url": poster_url,
            "trailer_url": trailer_url,
            "countries": countries,
            "genres": genres,
        }
    except httpx.RequestError as e:
        logger.warning('TMDB detail network error: %s', e)
        return {'error': 'tmdb_unavailable'}
    except httpx.HTTPStatusError as e:
        logger.warning('TMDB detail HTTP error: %s', e)
        return {'error': 'tmdb_unavailable'}
