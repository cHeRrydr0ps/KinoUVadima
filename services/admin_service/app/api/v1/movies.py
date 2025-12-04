from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user_with_role
from app.db.session import get_db
from app.models.movie_models import Movie, Genre
from app.schemas.movie import MovieCreate, MovieUpdate, MovieOut, GenreOut

router = APIRouter()

@router.get("/", response_model=List[MovieOut])
async def list_movies(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    title: Optional[str] = None,
    release_year: Optional[int] = None,
    is_new: Optional[bool] = None,
    is_exclusive: Optional[bool] = None,
    genre_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user_with_role(("admin", "moderator")))
):
    stmt = select(Movie).options(selectinload(Movie.genres))
    if title:
        stmt = stmt.where(Movie.title_local.ilike(f"%{title}%"))
    if release_year is not None:
        stmt = stmt.where(Movie.release_year == release_year)
    if is_new is not None:
        stmt = stmt.where(Movie.is_new == is_new)
    if is_exclusive is not None:
        stmt = stmt.where(Movie.is_exclusive == is_exclusive)
    if genre_id is not None:
        stmt = stmt.join(Movie.genres).where(Genre.genre_id == genre_id)
    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_movie(
    payload: MovieCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user_with_role(("admin", "moderator")))
):
    movie = Movie(**payload.model_dump(exclude={"genre_ids"}))
    if payload.genre_ids:
        genres = (await db.execute(select(Genre).where(Genre.genre_id.in_(payload.genre_ids)))).scalars().all()
        movie.genres = genres
    db.add(movie)
    await db.commit()
    await db.refresh(movie)
    
    # Публикуем событие о создании фильма
    try:
        from app.core.redis import publish_movie_event
        await publish_movie_event(
            movie_id=movie.movie_id,
            event_type="created",
            data={
                "movie_id": movie.movie_id,
                "title_local": movie.title_local,
                "title_original": movie.title_original,
                "synopsis": movie.synopsis,
            }
        )
    except Exception:
        # Игнорируем ошибки Redis, чтобы не ломать создание фильма
        pass
    
    # Возвращаем простой успешный ответ
    return {"message": "Movie created successfully"}

@router.get("/{movie_id}", response_model=MovieOut)
async def get_movie(
    movie_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user_with_role(("admin", "moderator")))
):
    result = await db.execute(
        select(Movie).options(selectinload(Movie.genres)).where(Movie.movie_id == movie_id)
    )
    movie = result.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie

@router.put("/{movie_id}", response_model=MovieOut)
async def update_movie(
    movie_id: int,
    payload: MovieUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user_with_role(("admin", "moderator")))
):
    # Загружаем фильм вместе с жанрами
    result = await db.execute(
        select(Movie).options(selectinload(Movie.genres)).where(Movie.movie_id == movie_id)
    )
    movie = result.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    # Обновляем атрибуты фильма
    update_data = payload.model_dump(exclude_unset=True, exclude={"genre_ids"})
    
    for k, v in update_data.items():
        setattr(movie, k, v)
    
    # Принудительно помечаем объект как измененный для SQLAlchemy
    from sqlalchemy.orm import make_transient_to_detached
    from sqlalchemy import inspect
    state = inspect(movie)
    if update_data:  # Если есть данные для обновления
        state.modified = True

    # Обновляем жанры, если они указаны в запросе
    if payload.genre_ids is not None:
        # Загружаем новые жанры
        result = await db.execute(select(Genre).where(Genre.genre_id.in_(payload.genre_ids)))
        new_genres = result.scalars().all()
        
        # Очищаем существующие жанры и добавляем новые
        movie.genres.clear()
        for genre in new_genres:
            movie.genres.append(genre)

    await db.commit()
    await db.refresh(movie)
    
    # Загружаем обновленный фильм с жанрами для гарантии корректности данных
    result = await db.execute(
        select(Movie).options(selectinload(Movie.genres)).where(Movie.movie_id == movie.movie_id)
    )
    updated_movie = result.scalar_one()

    # Публикуем событие об обновлении фильма
    try:
        from app.core.redis import publish_movie_event
        await publish_movie_event(
            movie_id=updated_movie.movie_id,
            event_type="updated",
            data={
                "movie_id": updated_movie.movie_id,
                "title_local": updated_movie.title_local,
                "title_original": updated_movie.title_original,
                "synopsis": updated_movie.synopsis,
            }
        )
    except Exception:
        # Игнорируем ошибки Redis, чтобы не ломать обновление фильма
        pass

    return updated_movie

@router.delete("/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_movie(
    movie_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user_with_role(("admin", "moderator")))
):
    result = await db.execute(select(Movie).where(Movie.movie_id == movie_id))
    movie = result.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    await db.delete(movie)
    await db.commit()

    # Публикуем событие об удалении фильма
    from app.core.redis import publish_movie_event
    await publish_movie_event(
        movie_id=movie_id,
        event_type="deleted"
    )

    return None

@router.get("/{movie_id}/genres", response_model=List[GenreOut])
async def get_movie_genres(
    movie_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user_with_role(("admin", "moderator")))
):
    result = await db.execute(
        select(Movie).options(selectinload(Movie.genres)).where(Movie.movie_id == movie_id)
    )
    movie = result.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie.genres
