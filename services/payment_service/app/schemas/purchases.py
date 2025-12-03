from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class PaymentMethodEnum(str, Enum):
    phone_transfer = "phone_transfer"
    invoice = "invoice"


class PurchaseStatusEnum(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class PurchaseCreate(BaseModel):
    movie_id: int
    movie_title: str | None = None
    amount: Decimal = Field(gt=0)
    currency: str = Field(default="RUB", min_length=1, max_length=8)
    payment_method: PaymentMethodEnum
    discount_percent: Decimal | None = Field(default=None, ge=0, le=100)
    proof_url: str | None = Field(default=None, max_length=512)
    customer_comment: str | None = Field(default=None, max_length=2000)


class PurchaseUpdateStatus(BaseModel):
    status: PurchaseStatusEnum
    admin_comment: str | None = Field(default=None, max_length=2000)
    delivery_url: str | None = Field(default=None, max_length=512)
    delivery_token: str | None = Field(default=None, max_length=255)

    @field_validator("status")
    @classmethod
    def _no_pending(cls, value: PurchaseStatusEnum) -> PurchaseStatusEnum:
        if value == PurchaseStatusEnum.pending:
            raise ValueError("status must be approved or rejected")
        return value


class PurchaseOut(BaseModel):
    id: int
    user_id: int
    user_name: str | None
    user_email: str | None
    movie_id: int
    movie_title: str | None
    amount: Decimal
    currency: str
    discount_percent: Decimal | None
    payment_method: PaymentMethodEnum
    status: PurchaseStatusEnum
    proof_url: str | None
    customer_comment: str | None
    admin_comment: str | None
    delivery_url: str | None
    delivery_token: str | None
    processed_by: int | None
    processed_at: datetime | None
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True


class PurchaseList(BaseModel):
    items: list[PurchaseOut]
    total: int

