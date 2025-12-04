from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import get_current_user_with_role
from app.db.session import get_db
from app.services.import_genres import import_genres_from_tmdb
from app.services.tmdb_service import search_tmdb_movie_by_name

router = APIRouter()


@router.post("/genres/import")
async def tmdb_import_genres_ru(
    lang: str = Query(default="ru-RU"),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user_with_role(("admin", "moderator")))
):
    try:
        added = await import_genres_from_tmdb(db, language=lang)
        return {"message": "Импорт жанров завершен", "added": added, "language": lang}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def tmdb_search(
    query: str = Query(..., min_length=1),
    _: dict = Depends(get_current_user_with_role(("admin", "moderator")))
):
    try:
        data = await search_tmdb_movie_by_name(query)
        return data.get("results", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
