"""Drop legacy films_b2c, genres, film_genre_association if exist

Revision ID: drop_legacy_films_b2c_20250830
Revises: migrate_to_movie_schema_20250830
Create Date: 2025-08-30
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "drop_legacy_films_b2c_20250830"
down_revision = "migrate_to_movie_schema_20250830"
branch_labels = None
depends_on = None

def upgrade():
    # Use raw SQL with IF EXISTS to be safe
    op.execute(sa.text("DROP TABLE IF EXISTS film_genre_association CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS genres CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS films_b2c CASCADE"))

def downgrade():
    # No-op; restoring legacy schema is not supported
    pass
