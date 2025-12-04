from sqlalchemy import Column, BigInteger, SmallInteger, Integer, String, Boolean, Numeric, Text, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

# Association table
movie_genre = Table(
    "movie_genre",
    Base.metadata,
    Column("movie_id", BigInteger, ForeignKey("movie.movie_id", ondelete="CASCADE"), primary_key=True),
    Column("genre_id", SmallInteger, ForeignKey("genre.genre_id", ondelete="CASCADE"), primary_key=True),
)

class Movie(Base):
    __tablename__ = "movie"

    movie_id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    title_local = Column(String(256), nullable=False)
    title_original = Column(String(256), nullable=True)
    synopsis = Column(Text, nullable=True)
    description_full = Column(Text, nullable=True)
    country_text = Column(String(128), nullable=True)
    release_year = Column(Integer, nullable=True)
    runtime_min = Column(Integer, nullable=True)
    age_rating = Column(String(8), nullable=True)
    imdb_rating = Column(Numeric(3, 1), nullable=True)
    expected_gross_rub = Column(Numeric(14, 2), nullable=True)
    is_new = Column(Boolean, nullable=False, default=False)
    is_exclusive = Column(Boolean, nullable=False, default=False)
    price_rub = Column(Numeric(12, 2), nullable=False)
    discount_rub = Column(Numeric(12, 2), nullable=True)
    torrent_url = Column(Text, nullable=True)
    poster_url = Column(Text, nullable=True)
    poster_storage_key = Column(String(255), nullable=True)
    trailer_url = Column(Text, nullable=True)
    trailer_storage_key = Column(String(255), nullable=True)
    signed_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    genres = relationship("Genre", secondary="movie_genre", back_populates="movies")

class Genre(Base):
    __tablename__ = "genre"

    genre_id = Column(SmallInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(64), nullable=False, unique=True)

    movies = relationship("Movie", secondary="movie_genre", back_populates="genres")
