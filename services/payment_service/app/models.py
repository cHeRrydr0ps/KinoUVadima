from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Numeric,
    UniqueConstraint,
    Boolean,
    Text,
)
from sqlalchemy.sql import func
import enum
from app.db.session import Base
from sqlalchemy.dialects.postgresql import ENUM

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    succeeded = "succeeded"
    failed = "failed"
    canceled = "canceled"

class PaymentAttempt(Base):
    __tablename__ = "payment_attempts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    plan_id = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    provider_payment_id = Column(String, index=True)            # e.g., YooKassa payment.id
    provider_session_id = Column(String, index=True)            # for hosted checkout sessions
    payment_method_id = Column(String, index=True)              # for recurring
    idempotence_key = Column(String, index=True)                # for retries
    status = Column(ENUM(PaymentStatus, name="paymentstatus", create_type=False), default=PaymentStatus.pending, nullable=False)
    amount = Column(Numeric(10, 2), nullable=True)
    currency = Column(String, nullable=True)
    duration_days = Column(Integer, nullable=False)             # subscription prolongation
    capture_required = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("provider", "provider_payment_id", name="uq_provider_payment"),
    )


class PurchaseStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class PaymentMethod(str, enum.Enum):
    phone_transfer = "phone_transfer"
    invoice = "invoice"


class FilmPurchaseRequest(Base):
    __tablename__ = "film_purchase_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    user_name = Column(String(255), nullable=True)
    user_email = Column(String(255), nullable=True)
    movie_id = Column(Integer, index=True, nullable=False)
    movie_title = Column(String(255), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(8), nullable=False, default="RUB")
    discount_percent = Column(Numeric(5, 2), nullable=True)
    payment_method = Column(ENUM(PaymentMethod, name="paymentmethod", create_type=False), nullable=False)
    status = Column(ENUM(PurchaseStatus, name="purchasestatus", create_type=False), nullable=False, default=PurchaseStatus.pending)
    proof_url = Column(String(512), nullable=True)
    customer_comment = Column(Text, nullable=True)
    admin_comment = Column(Text, nullable=True)
    delivery_url = Column(String(512), nullable=True)
    delivery_token = Column(String(255), nullable=True)
    processed_by = Column(Integer, nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "movie_id",
            "status",
            name="uq_purchase_user_movie_pending",
        ),
    )

