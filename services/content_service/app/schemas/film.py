
from pydantic import BaseModel
from typing import List, Optional

class GenreResponse(BaseModel):
    genre_id: int
    name: str

    class Config:
        from_attributes = True

class FilmCard(BaseModel):
    movie_id: int
    title_local: str
    poster_url: Optional[str] = None
    imdb_rating: Optional[float] = None
    release_year: Optional[int] = None
    is_new: Optional[bool] = False
    is_exclusive: Optional[bool] = False
    genres: List[GenreResponse] = []
    price_rub: Optional[float] = None

    class Config:
        from_attributes = True

class FilmDetail(FilmCard):
    torrent_url: Optional[str] = None
    signed_url: Optional[str] = None
    title_original: Optional[str] = None
    synopsis: Optional[str] = None
    description_full: Optional[str] = None
    runtime_min: Optional[int] = None
    country_text: Optional[str] = None
    age_rating: Optional[str] = None
    trailer_url: Optional[str] = None

class MoviesResponse(BaseModel):
    movies: List[FilmDetail]  # Изменено с FilmCard на FilmDetail
    total: int
    limit: int
    offset: int
    has_next: bool
