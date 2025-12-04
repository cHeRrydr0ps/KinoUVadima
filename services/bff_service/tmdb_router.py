
# services/bff_service/tmdb_router.py
from fastapi import APIRouter, Query
import os, httpx
import logging

router = APIRouter()
logger = logging.getLogger("tmdb_router")

POISKKINO_API_KEY = os.getenv("POISKKINO_API_KEY") or os.getenv("POISKKINO_KEY")
POISKKINO_BASE_URL = os.getenv("POISKKINO_BASE_URL", "https://api.poiskkino.dev")

def _headers():
    h = {"Accept": "application/json"}
    if POISKKINO_API_KEY:
        h["X-API-KEY"] = POISKKINO_API_KEY
    return h

def _base_url(path: str) -> str:
    return f"{POISKKINO_BASE_URL.rstrip('/')}{path}"

@router.get("/search")
async def search(q: str = Query(..., min_length=1)):
    url = _base_url("/v1.4/movie/search")
    headers = _headers()
    params = {"query": q, "limit": 10}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url, headers=headers, params=params)
        r.raise_for_status()
        data = r.json()
        docs = data.get("docs") or []
        results = []
        for it in docs:
            title = it.get("name") or it.get("alternativeName") or it.get("enName")
            original_title = it.get("alternativeName") or it.get("enName") or it.get("name")
            results.append({
                "id": it.get("id"),
                "title": title,
                "original_title": original_title,
                "release_year": it.get("year"),
            })
        return {"results": results}
    except httpx.RequestError as e:
        logger.warning('PoiskKino search network error: %s', e)
        return {'results': []}
    except httpx.HTTPStatusError as e:
        logger.warning('PoiskKino search HTTP error: %s', e)
        return {'results': []}
    except Exception as e:
        logger.error('PoiskKino search unexpected error: %s', e)
        return {'results': []}

@router.get("/movie/{tmdb_id}")
async def movie(tmdb_id: int):
    url = _base_url(f"/v1.4/movie/{tmdb_id}")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url, headers=_headers())
        r.raise_for_status()
        m = r.json()
        trailer_url = None
        for v in ((m.get("videos") or {}).get("trailers") or []):
            if v.get("url"):
                trailer_url = v.get("url")
                break
        poster_url = None
        poster = m.get("poster") or {}
        backdrop = m.get("backdrop") or {}
        if poster.get("url"):
            poster_url = poster.get("url")
        elif backdrop.get("url"):
            poster_url = backdrop.get("url")

        countries = ", ".join([c.get("name") for c in (m.get("countries") or []) if c.get("name")])
        genres = [{"name": g.get("name")} for g in (m.get("genres") or []) if g.get("name")]
        rating = (m.get("rating") or {})
        vote_average = rating.get("imdb") or rating.get("kp") or rating.get("tmdb")
        return {
            "title": m.get("name") or m.get("alternativeName") or m.get("enName"),
            "original_title": m.get("alternativeName") or m.get("enName") or m.get("name"),
            "overview": m.get("description") or m.get("shortDescription"),
            "release_year": m.get("year"),
            "runtime": m.get("movieLength") or m.get("seriesLength"),
            "vote_average": vote_average,
            "poster_url": poster_url,
            "trailer_url": trailer_url,
            "countries": countries,
            "genres": genres,
        }
    except httpx.RequestError as e:
        logger.warning('PoiskKino detail network error: %s', e)
        return {'error': 'tmdb_unavailable'}
    except httpx.HTTPStatusError as e:
        logger.warning('PoiskKino detail HTTP error: %s', e)
        return {'error': 'tmdb_unavailable'}
