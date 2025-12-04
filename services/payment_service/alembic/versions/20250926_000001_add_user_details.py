"""add user name and email to purchase requests

Revision ID: 20250926_000001
Revises: 20250925000001
Create Date: 2025-09-26 18:05:00
"""

from alembic import op
import sqlalchemy as sa

revision = "20250926_000001"
down_revision = "20250925000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("film_purchase_requests", sa.Column("user_name", sa.String(length=255), nullable=True))
    op.add_column("film_purchase_requests", sa.Column("user_email", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("film_purchase_requests", "user_email")
    op.drop_column("film_purchase_requests", "user_name")
