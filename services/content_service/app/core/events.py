from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session
from app.models.movie import Movie, Genre

async def handle_movie_event(event: dict[str, Any]) -> None:
    """Обработчик событий от admin_service
    
    Args:
        event: Событие с информацией о фильме
    """
    event_type = event["event_type"]
    movie_id = event["movie_id"]
    
    async with get_async_session() as db:
        if event_type == "deleted":
            # Удаляем фильм, если он существует
            movie = await db.get(Movie, movie_id)
            if movie:
                await db.delete(movie)
                await db.commit()
        
        elif event_type in ("created", "updated"):
            movie_data = event["data"]
            
            # Получаем или создаем фильм
            movie = await db.get(Movie, movie_id)
            if not movie:
                movie = Movie(movie_id=movie_id)
                db.add(movie)
            
            # Обновляем данные фильма
            for k, v in movie_data.items():
                if k != "genres" and hasattr(movie, k):
                    setattr(movie, k, v)
            
            await db.commit()
