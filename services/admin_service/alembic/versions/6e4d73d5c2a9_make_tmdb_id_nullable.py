"""make tmdb_id nullable for genres (PoiskKino import)

Revision ID: 6e4d73d5c2a9
Revises: e14f1af20612
Create Date: 2025-03-14
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '6e4d73d5c2a9'
down_revision = 'e14f1af20612'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    # Prefer legacy table name if present; otherwise skip to avoid crashing when table was dropped.
    if 'genres' in inspector.get_table_names():
        cols = {c['name'] for c in inspector.get_columns('genres')}
        if 'tmdb_id' in cols:
            op.alter_column('genres', 'tmdb_id', existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'genres' in inspector.get_table_names():
        cols = {c['name'] for c in inspector.get_columns('genres')}
        if 'tmdb_id' in cols:
            op.alter_column('genres', 'tmdb_id', existing_type=sa.Integer(), nullable=False)
