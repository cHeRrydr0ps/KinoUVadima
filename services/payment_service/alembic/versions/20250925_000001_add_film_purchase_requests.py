"""add film purchase requests table

Revision ID: 20250925000001
Revises: 20250809114403
Create Date: 2025-09-25 14:25:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20250925000001"
down_revision = "20250809114403"
branch_labels = None
depends_on = None

PURCHASE_STATUS_TYPE = "purchasestatus"
PAYMENT_METHOD_TYPE = "paymentmethod"

purchase_status_enum = postgresql.ENUM(
    "pending",
    "approved",
    "rejected",
    name=PURCHASE_STATUS_TYPE,
    create_type=False,
)

payment_method_enum = postgresql.ENUM(
    "phone_transfer",
    "invoice",
    name=PAYMENT_METHOD_TYPE,
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    purchase_status_enum.create(bind, checkfirst=True)
    payment_method_enum.create(bind, checkfirst=True)

    op.create_table(
        "film_purchase_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("movie_id", sa.Integer(), nullable=False),
        sa.Column("movie_title", sa.String(length=255), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default=sa.text("'RUB'")),
        sa.Column("discount_percent", sa.Numeric(5, 2), nullable=True),
        sa.Column("payment_method", payment_method_enum, nullable=False),
        sa.Column("status", purchase_status_enum, nullable=False, server_default=sa.text("'pending'")),
        sa.Column("proof_url", sa.String(length=512), nullable=True),
        sa.Column("customer_comment", sa.Text(), nullable=True),
        sa.Column("admin_comment", sa.Text(), nullable=True),
        sa.Column("delivery_url", sa.String(length=512), nullable=True),
        sa.Column("delivery_token", sa.String(length=255), nullable=True),
        sa.Column("processed_by", sa.Integer(), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("timezone('utc', now())"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("user_id", "movie_id", "status", name="uq_purchase_user_movie_pending"),
    )

    op.create_index("ix_film_purchase_requests_user_id", "film_purchase_requests", ["user_id"])
    op.create_index("ix_film_purchase_requests_movie_id", "film_purchase_requests", ["movie_id"])


def downgrade() -> None:
    op.drop_index("ix_film_purchase_requests_movie_id", table_name="film_purchase_requests")
    op.drop_index("ix_film_purchase_requests_user_id", table_name="film_purchase_requests")
    op.drop_table("film_purchase_requests")

    bind = op.get_bind()
    payment_method_enum.drop(bind, checkfirst=True)
    purchase_status_enum.drop(bind, checkfirst=True)
