from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.security import get_current_user_with_role
from app.db.session import get_db
from app.models.movie_models import Genre
from app.schemas.movie import GenreCreate, GenreUpdate, GenreOut

router = APIRouter()

@router.get("/", response_model=List[GenreOut])
async def list_genres(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user_with_role(("admin", "moderator")))
):
    res = await db.execute(select(Genre).order_by(Genre.name.asc()))
    return res.scalars().all()

@router.post("/", response_model=GenreOut, status_code=status.HTTP_201_CREATED)
async def create_genre(
    payload: GenreCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user_with_role(("admin", "moderator")))
):
    genre = Genre(**payload.model_dump())
    db.add(genre)
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    await db.refresh(genre)
    return genre

@router.get("/{genre_id}", response_model=GenreOut)
async def get_genre(
    genre_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user_with_role(("admin", "moderator")))
):
    res = await db.execute(select(Genre).where(Genre.genre_id == genre_id))
    genre = res.scalar_one_or_none()
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")
    return genre

@router.put("/{genre_id}", response_model=GenreOut)
async def update_genre(
    genre_id: int,
    payload: GenreUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user_with_role(("admin", "moderator")))
):
    res = await db.execute(select(Genre).where(Genre.genre_id == genre_id))
    genre = res.scalar_one_or_none()
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(genre, k, v)
    await db.commit()
    await db.refresh(genre)
    return genre

@router.delete("/{genre_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_genre(
    genre_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user_with_role(("admin", "moderator")))
):
    res = await db.execute(select(Genre).where(Genre.genre_id == genre_id))
    genre = res.scalar_one_or_none()
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")
    await db.delete(genre)
    await db.commit()
    return None
