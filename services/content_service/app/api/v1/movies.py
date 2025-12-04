
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, or_, desc, asc
from typing import Optional, List

from app.db.session import get_async_session
from app.models.movie import Movie, Genre, movie_genre
from app.schemas.film import FilmCard, FilmDetail, GenreResponse, MoviesResponse

router = APIRouter()

@router.get("/movies", response_model=MoviesResponse)
async def get_movies(
    db: AsyncSession = Depends(get_async_session),
    search: Optional[str] = Query(None, description="Search by title"),
    genre_id: Optional[int] = Query(None, description="Filter by genre ID"),
    limit: int = Query(20, ge=1, le=100, description="Number of movies per page"),
    offset: int = Query(0, ge=0, description="Number of movies to skip"),
    sort_by: str = Query("release_year", description="Sort field: release_year, title, imdb_rating"),
    sort_order: str = Query("desc", description="Sort order: asc or desc")
):
    """Get list of movies with filtering, search and pagination"""
    
    # Base query
    query = select(Movie).options(selectinload(Movie.genres))
    
    # Apply search filter
    if search:
        search_term = f"%{search.lower()}%"
        query = query.where(
            or_(
                Movie.title_local.ilike(search_term),
                Movie.title_original.ilike(search_term)
            )
        )
    
    # Apply genre filter
    if genre_id:
        query = query.join(movie_genre).where(movie_genre.c.genre_id == genre_id)
    
    # Apply sorting
    sort_column = getattr(Movie, sort_by, Movie.release_year)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))
    
    # Get total count for pagination
    count_query = select(Movie)
    if search:
        search_term = f"%{search.lower()}%"
        count_query = count_query.where(
            or_(
                Movie.title_local.ilike(search_term),
                Movie.title_original.ilike(search_term)
            )
        )
    if genre_id:
        count_query = count_query.join(movie_genre).where(movie_genre.c.genre_id == genre_id)
    
    total_result = await db.execute(count_query)
    total = len(total_result.scalars().all())
    
    # Apply pagination
    query = query.offset(offset).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    movies = result.scalars().all()
    
    return MoviesResponse(
        movies=movies,
        total=total,
        limit=limit,
        offset=offset,
        has_next=offset + limit < total
    )

@router.get("/movies/{movie_id}", response_model=FilmDetail)
async def get_movie_by_id(movie_id: int, db: AsyncSession = Depends(get_async_session)):
    result = await db.execute(
        select(Movie)
        .options(selectinload(Movie.genres))
        .where(Movie.movie_id == movie_id)
    )
    movie = result.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie

@router.get("/genres", response_model=List[GenreResponse])
async def get_genres(db: AsyncSession = Depends(get_async_session)):
    """Get list of all genres"""
    result = await db.execute(select(Genre).order_by(Genre.name))
    genres = result.scalars().all()
    return genres
