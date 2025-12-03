from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import get_current_user_with_role
from app.db.session import get_db
from app.services.import_genres import import_genres_from_tmdb

router = APIRouter()

@router.post("/genres/import")
async def tmdb_import_genres_ru(
    lang: str = Query(default="ru-RU"),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user_with_role(("admin","moderator")))
):
    try:
        added = await import_genres_from_tmdb(db, language=lang)  # по умолчанию ru-RU
        return {"message": f"Импорт жанров завершён", "added": added, "language": lang}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
