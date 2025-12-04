import os
import httpx
from dotenv import load_dotenv

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

load_dotenv()

POISKKINO_API_KEY = os.getenv("POISKKINO_API_KEY") or os.getenv("POISKKINO_KEY")
POISKKINO_BASE_URL = os.getenv("POISKKINO_BASE_URL", "https://api.poiskkino.dev")

headers = {
    "X-API-KEY": POISKKINO_API_KEY or "",
    "Accept": "application/json"
}


async def search_tmdb_movie_by_name(query: str) -> dict:
    url = f"{POISKKINO_BASE_URL.rstrip('/')}/v1.4/movie/search"
    params = {"query": query, "limit": 10}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        docs = data.get("docs") or []
        mapped = []
        for it in docs:
            mapped.append({
                "id": it.get("id"),
                "title": it.get("name") or it.get("alternativeName") or it.get("enName"),
                "original_title": it.get("alternativeName") or it.get("enName") or it.get("name"),
                "release_year": it.get("year"),
                "poster_url": (it.get("poster") or {}).get("url") or (it.get("backdrop") or {}).get("url"),
            })
        return {"results": mapped}

async def fetch_tmdb_movie(tmdb_id: int) -> dict:
    url = f"{POISKKINO_BASE_URL.rstrip('/')}/v1.4/movie/{tmdb_id}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        return response.json()



# async def import_tmdb_film_to_db(tmdb_id: int, db: AsyncSession): Пока не нужна
#     data = await fetch_tmdb_movie(tmdb_id)
#
#     # Получаем жанры по внешним TMDb ID
#     genre_ids = [genre["id"] for genre in data.get("genres", [])]
#     genres = []
#     if genre_ids:
#         result = await db.execute(select(Genre).where(Genre.tmdb_id.in_(genre_ids)))
#         genres = result.scalars().all()
#
#     # Собираем данные
#     film_data = FilmCreate(
#         title_localized=data["title"],
#         title_original=data.get("original_title"),
#         short_description=data.get("tagline"),
#         full_description=data.get("overview"),
#         year=int(data.get("release_date", "0000")[:4]) if data.get("release_date") else None,
#         country=",".join([c["name"] for c in data.get("production_countries", [])]),
#         age_rating=None,
#         imdb_rating=data.get("vote_average"),
#         poster_url=f"https://image.tmdb.org/t/p/w500{data['poster_path']}" if data.get("poster_path") else None,
#         genre_ids=genre_ids
#     )
#
#     # Создаём фильм
#     new_film = FilmB2C(**film_data.dict(exclude={"genre_ids"}), genres=genres)
#
#     db.add(new_film)
#     await db.commit()
#     await db.refresh(new_film)
#     return new_film
