"""Create movie, genre, movie_genre and migrate from legacy tables if present

Revision ID: migrate_to_movie_schema_20250830
Revises: c0de17031e2c
Create Date: 2025-08-30

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "migrate_to_movie_schema_20250830"
down_revision = "c9d02294f3fd"
branch_labels = None
depends_on = None

def upgrade():
    # Create new tables
    op.create_table(
        "genre",
        sa.Column("genre_id", sa.SmallInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=64), nullable=False, unique=True),
    )
    op.create_table(
        "movie",
        sa.Column("movie_id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("title_local", sa.String(length=256), nullable=False),
        sa.Column("title_original", sa.String(length=256), nullable=True),
        sa.Column("synopsis", sa.Text(), nullable=True),
        sa.Column("description_full", sa.Text(), nullable=True),
        sa.Column("country_text", sa.String(length=128), nullable=True),
        sa.Column("release_year", sa.Integer(), nullable=True),
        sa.Column("runtime_min", sa.Integer(), nullable=True),
        sa.Column("age_rating", sa.String(length=8), nullable=True),
        sa.Column("imdb_rating", sa.Numeric(3,1), nullable=True),
        sa.Column("expected_gross_rub", sa.Numeric(14,2), nullable=True),
        sa.Column("is_new", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_exclusive", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("price_rub", sa.Numeric(12,2), nullable=False),
        sa.Column("discount_rub", sa.Numeric(12,2), nullable=True),
        sa.Column("torrent_url", sa.Text(), nullable=True),
        sa.Column("poster_url", sa.Text(), nullable=True),
        sa.Column("poster_storage_key", sa.String(length=255), nullable=True),
        sa.Column("trailer_url", sa.Text(), nullable=True),
        sa.Column("trailer_storage_key", sa.String(length=255), nullable=True),
        sa.Column("signed_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "movie_genre",
        sa.Column("movie_id", sa.BigInteger(), sa.ForeignKey("movie.movie_id", ondelete="CASCADE"), primary_key=True),
        sa.Column("genre_id", sa.SmallInteger(), sa.ForeignKey("genre.genre_id", ondelete="CASCADE"), primary_key=True),
    )

    # Try to migrate from legacy tables if they exist
    conn = op.get_bind()
    # Migrate genres
    try:
        conn.execute(sa.text("INSERT INTO genre(name) SELECT DISTINCT name FROM genres ON CONFLICT DO NOTHING"))
    except Exception:
        pass

    # Migrate movies
    # Map legacy columns -> new columns if films_b2c exists
    try:
        conn.execute(sa.text("""
            INSERT INTO movie (
                title_local, title_original, synopsis, description_full, country_text,
                release_year, runtime_min, age_rating, imdb_rating,
                is_new, is_exclusive, price_rub, torrent_url, poster_url, trailer_url, created_at
            )
            SELECT
                title_localized, title_original, short_description, full_description, country,
                year, duration, age_rating, imdb_rating,
                is_new, is_exclusive,
                0,
                NULL, poster_url, trailer_url, COALESCE(created_at, NOW())
            FROM films_b2c
            WHERE COALESCE(is_deleted, false) = false
        """))
    except Exception:
        pass

    # Migrate film-genre links if both legacy tables exist
    try:
        conn.execute(sa.text("""
            INSERT INTO movie_genre (movie_id, genre_id)
            SELECT m.movie_id, g2.genre_id
            FROM movie m
            JOIN films_b2c f ON f.title_localized = m.title_local
            JOIN film_genre_association fga ON fga.film_id = f.id
            JOIN genres g ON g.id = fga.genre_id
            JOIN genre g2 ON g2.name = g.name
        """))
    except Exception:
        pass

def downgrade():
    op.drop_table("movie_genre")
    op.drop_table("movie")
    op.drop_table("genre")
