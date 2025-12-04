from typing import List, Optional, ForwardRef
from pydantic import BaseModel, Field
from decimal import Decimal

class GenreBase(BaseModel):
    name: str

class GenreCreate(GenreBase):
    pass

class GenreUpdate(GenreBase):
    pass

class GenreOut(GenreBase):
    genre_id: int
    
    class Config:
        from_attributes = True

class MovieBase(BaseModel):
    title_local: str
    title_original: Optional[str] = None
    synopsis: Optional[str] = None
    description_full: Optional[str] = None
    country_text: Optional[str] = None
    release_year: Optional[int] = None
    runtime_min: Optional[int] = None
    age_rating: Optional[str] = None
    imdb_rating: Optional[Decimal] = Field(None, max_digits=3, decimal_places=1)
    expected_gross_rub: Optional[Decimal] = Field(None, max_digits=14, decimal_places=2)
    is_new: bool = False
    is_exclusive: bool = False
    price_rub: Decimal = Field(default=Decimal('0.00'), max_digits=12, decimal_places=2)
    discount_rub: Optional[Decimal] = Field(None, max_digits=12, decimal_places=2)
    torrent_url: Optional[str] = None
    poster_url: Optional[str] = None
    poster_storage_key: Optional[str] = None
    trailer_url: Optional[str] = None
    trailer_storage_key: Optional[str] = None
    signed_url: Optional[str] = None
    genre_ids: List[int] = Field(default_factory=list)

class MovieCreate(MovieBase):
    pass

class MovieUpdate(MovieBase):
    pass

class MovieOut(MovieBase):
    movie_id: int
    genres: List[GenreOut] = []

    class Config:
        from_attributes = True


