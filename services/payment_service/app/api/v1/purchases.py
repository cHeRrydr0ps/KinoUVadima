from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, inspect as sa_inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user_id, require_admin_user
from app.db.session import get_db
from app.models import (
    FilmPurchaseRequest,
    PaymentMethod,
    PurchaseStatus,
)
from app.schemas.purchases import (
    PurchaseCreate,
    PurchaseList,
    PurchaseOut,
    PurchaseStatusEnum,
    PurchaseUpdateStatus,
)
from app.services.auth_client import get_user
from app.services.content_client import get_movie

from app.services.email_client import send_template_email, send_bulk_template_email
from app.utils.telegram import send_telegram_message
from app.settings import (
    ADMIN_PORTAL_URL,
    INVOICE_DETAILS,
    PAYMENT_ADMIN_EMAILS,
    PHONE_PAYMENT_NUMBER,
    PROJECT_NAME,
    SUPPORT_EMAIL,
    USER_PORTAL_URL,
)

router = APIRouter()


logger = logging.getLogger(__name__)


def _map_status(status: PurchaseStatusEnum | None) -> PurchaseStatus | None:
    if status is None:
        return None
    return PurchaseStatus(status.value)


def _map_method(method: str) -> PaymentMethod:
    return PaymentMethod(method)


async def _attach_user_details(purchases: list[FilmPurchaseRequest]) -> None:
    if not purchases:
        return

    missing_ids = [
        purchase.user_id
        for purchase in purchases
        if not getattr(purchase, "user_name", None) or not getattr(purchase, "user_email", None)
    ]

    seen: set[int] = set()
    unique_ids: list[int] = []
    for uid in missing_ids:
        if uid not in seen:
            seen.add(uid)
            unique_ids.append(uid)

    if not unique_ids:
        return

    results = await asyncio.gather(*(get_user(uid) for uid in unique_ids), return_exceptions=True)
    resolved: dict[int, tuple[str | None, str | None]] = {}
    for uid, result in zip(unique_ids, results):
        if isinstance(result, Exception):
            continue
        if not isinstance(result, dict):
            continue
        name = result.get("name") or result.get("email")
        email = result.get("email")
        if name or email:
            resolved[uid] = (name, email)

    for purchase in purchases:
        info = resolved.get(purchase.user_id)
        if not info:
            continue
        name, email = info
        if not getattr(purchase, "user_name", None) and name:
            purchase.user_name = name
        if not getattr(purchase, "user_email", None) and email:
            purchase.user_email = email


def _purchase_to_payload(purchase: FilmPurchaseRequest) -> dict:
    state = sa_inspect(purchase)
    data = {col.key: state.dict.get(col.key) for col in state.mapper.column_attrs}

    payment_method = data.get("payment_method")
    if isinstance(payment_method, PaymentMethod):
        data["payment_method"] = payment_method.value

    status = data.get("status")
    if isinstance(status, PurchaseStatus):
        data["status"] = status.value

    # ensure optional user info keys exist even if not selected from DB
    data.setdefault("user_name", getattr(purchase, "user_name", None))
    data.setdefault("user_email", getattr(purchase, "user_email", None))

    return data




CURRENCY_LABELS = {
    "RUB": "руб.",
}


def _format_decimal(value: Decimal | None) -> str | None:
    if value is None:
        return None
    if not isinstance(value, Decimal):
        value = Decimal(value)
    quantized = value.quantize(Decimal("0.01"))
    text = format(quantized, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text


def _format_datetime(value: datetime | None) -> str:
    if value is None:
        return ""
    if value.tzinfo is not None:
        value = value.astimezone()
    return value.strftime("%d.%m.%Y %H:%M")


def _human_currency(code: str | None) -> str:
    if not code:
        return ""
    return CURRENCY_LABELS.get(code.upper(), code.upper())


def _build_common_context(purchase: dict[str, Any], *, user_profile: dict[str, Any] | None = None) -> dict[str, Any]:
    profile = user_profile or {}
    discount_raw = purchase.get("discount_percent")
    discount_value = _format_decimal(discount_raw)
    if discount_value == "0":
        discount_value = None
    admin_comment = purchase.get("admin_comment")
    customer_comment = purchase.get("customer_comment")
    amount_value = _format_decimal(purchase.get("amount")) or "0"
    context = {
        "project_name": PROJECT_NAME,
        "order_id": purchase.get("id"),
        "movie_id": purchase.get("movie_id"),
        "movie_title": purchase.get("movie_title") or f"ID {purchase.get('movie_id')}",
        "full_name": purchase.get("user_name") or purchase.get("user_email") or f"ID {purchase.get('user_id')}",
        "user_email": purchase.get("user_email"),
        "user_id": purchase.get("user_id"),
        "user_inn": profile.get("inn"),
        "amount": amount_value,
        "currency": _human_currency(purchase.get("currency")),
        "discount_percent": discount_value,
        "payment_method": purchase.get("payment_method"),
        "customer_comment": customer_comment.strip() if isinstance(customer_comment, str) and customer_comment.strip() else None,
        "admin_comment": admin_comment.strip() if isinstance(admin_comment, str) and admin_comment.strip() else None,
        "support_email": SUPPORT_EMAIL,
        "payment_phone": PHONE_PAYMENT_NUMBER or None,
        "invoice_details": INVOICE_DETAILS or None,
        "admin_portal_url": ADMIN_PORTAL_URL,
        "user_portal_url": USER_PORTAL_URL,
        "created_at": _format_datetime(purchase.get("created_at")),
    }
    admin_emails = [email for email in PAYMENT_ADMIN_EMAILS if email]
    if not admin_emails and SUPPORT_EMAIL:
        admin_emails = [SUPPORT_EMAIL]
    context["payment_admin_contact"] = ", ".join(admin_emails) if admin_emails else None
    context["payment_admin_mailto"] = ",".join(admin_emails) if admin_emails else None
    context["has_payment_admin_contact"] = bool(admin_emails)
    return context



async def _resolve_delivery_url(movie_id: int, fallback: str | None = None) -> str | None:
    if fallback:
        return fallback
    try:
        movie = await get_movie(movie_id)
    except Exception as exc:
        logger.warning("Failed to fetch movie %s for delivery URL: %s", movie_id, exc)
        return None
    if not isinstance(movie, dict):
        return None
    return movie.get("signed_url") or movie.get("torrent_url")




async def _send_purchase_created_notifications(purchase: dict[str, Any], user_profile: dict[str, Any] | None = None) -> None:
    try:
        context = _build_common_context(purchase, user_profile=user_profile)
        subject_user = f"[{PROJECT_NAME}] Заявка №{purchase.get('id')} оформлена"
        await send_template_email(context.get("user_email"), subject_user, "email/purchase_created_user", context)

        if PAYMENT_ADMIN_EMAILS:
            admin_subject = f"[{PROJECT_NAME}] Новая заявка №{purchase.get('id')}"
            admin_context = dict(context)
            await send_bulk_template_email(PAYMENT_ADMIN_EMAILS, admin_subject, "email/purchase_created_admin", admin_context)
        # Telegram notification
        try:
            await send_telegram_message(
                f"🛒 Новая заявка на заказ\n"
                f"ID: {purchase.get('id')}\n"
                f"Фильм: {purchase.get('movie_title') or purchase.get('movie_id')}\n"
                f"Сумма: {purchase.get('amount')} {purchase.get('currency')}\n"
                f"Пользователь: {purchase.get('user_email') or purchase.get('user_id')}"
            )
        except Exception:
            logger.exception("Failed to send telegram notification for purchase %s", purchase.get('id'))
    except Exception:
        logger.exception("Failed to send notifications for purchase %s", purchase.get('id'))


async def _send_purchase_approved_notification(purchase: dict[str, Any], user_profile: dict[str, Any] | None = None) -> None:
    try:
        context = _build_common_context(purchase, user_profile=user_profile)
        subject = f"[{PROJECT_NAME}] Оплата подтверждена — заявка №{purchase.get('id')}"
        await send_template_email(context.get("user_email"), subject, "email/purchase_approved", context)
    except Exception:
        logger.exception("Failed to send approval email for purchase %s", purchase.get('id'))


async def _send_purchase_rejected_notification(purchase: dict[str, Any], user_profile: dict[str, Any] | None = None) -> None:
    try:
        context = _build_common_context(purchase, user_profile=user_profile)
        subject = f"[{PROJECT_NAME}] Заявка №{purchase.get('id')} отклонена"
        await send_template_email(context.get("user_email"), subject, "email/purchase_rejected", context)
    except Exception:
        logger.exception("Failed to send rejection email for purchase %s", purchase.get('id'))


@router.post("/", response_model=PurchaseOut, status_code=status.HTTP_201_CREATED)
async def create_purchase_request(
    payload: PurchaseCreate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> PurchaseOut:
    user_name: str | None = None
    user_email: str | None = None
    user_profile: dict[str, Any] | None = None
    try:
        user_data = await get_user(user_id)
    except Exception:
        user_data = None
    if isinstance(user_data, dict):
        user_profile = user_data
        user_name = user_data.get("name") or user_data.get("email")
        user_email = user_data.get("email")

    purchase = FilmPurchaseRequest(
        user_id=user_id,
        user_name=user_name,
        user_email=user_email,
        movie_id=payload.movie_id,
        movie_title=payload.movie_title,
        amount=payload.amount,
        currency=payload.currency.upper(),
        discount_percent=payload.discount_percent,
        payment_method=_map_method(payload.payment_method.value),
        proof_url=payload.proof_url,
        customer_comment=payload.customer_comment,
    )
    db.add(purchase)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Purchase request already exists") from exc
    await db.refresh(purchase)
    await _attach_user_details([purchase])
    purchase_payload = _purchase_to_payload(purchase)
    await _send_purchase_created_notifications(purchase_payload, user_profile=user_profile)
    return PurchaseOut(**purchase_payload)


@router.get("/my", response_model=list[PurchaseOut])
async def list_my_purchases(
    status_filter: PurchaseStatusEnum | None = Query(default=None),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[PurchaseOut]:
    stmt = select(FilmPurchaseRequest).where(FilmPurchaseRequest.user_id == user_id)
    mapped = _map_status(status_filter)
    if mapped is not None:
        stmt = stmt.where(FilmPurchaseRequest.status == mapped)
    stmt = stmt.order_by(FilmPurchaseRequest.created_at.desc())
    result = await db.execute(stmt)
    purchases = result.scalars().all()
    await _attach_user_details(purchases)
    return [PurchaseOut(**_purchase_to_payload(p)) for p in purchases]


@router.get("/", response_model=PurchaseList)
async def admin_list_purchases(
    status_filter: PurchaseStatusEnum | None = Query(default=None),
    user_id_filter: int | None = Query(default=None),
    movie_id_filter: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: int = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
) -> PurchaseList:
    stmt = select(FilmPurchaseRequest)
    count_stmt = select(func.count()).select_from(FilmPurchaseRequest)

    filters = []
    mapped = _map_status(status_filter)
    if mapped is not None:
        filters.append(FilmPurchaseRequest.status == mapped)
    if user_id_filter is not None:
        filters.append(FilmPurchaseRequest.user_id == user_id_filter)
    if movie_id_filter is not None:
        filters.append(FilmPurchaseRequest.movie_id == movie_id_filter)

    for flt in filters:
        stmt = stmt.where(flt)
        count_stmt = count_stmt.where(flt)

    stmt = stmt.order_by(FilmPurchaseRequest.created_at.desc()).limit(limit).offset(offset)

    rows = await db.execute(stmt)
    purchases = rows.scalars().all()
    await _attach_user_details(purchases)

    total_result = await db.execute(count_stmt)
    total = int(total_result.scalar_one())

    items = [PurchaseOut(**_purchase_to_payload(p)) for p in purchases]
    return PurchaseList(items=items, total=total)


@router.patch("/{purchase_id}", response_model=PurchaseOut)
async def admin_update_purchase(
    purchase_id: int,
    payload: PurchaseUpdateStatus,
    admin_user_id: int = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
) -> PurchaseOut:
    result = await db.execute(
        select(FilmPurchaseRequest).where(FilmPurchaseRequest.id == purchase_id)
    )
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    if purchase.status != PurchaseStatus.pending:
        raise HTTPException(status_code=400, detail="Purchase request already processed")

    new_status = PurchaseStatus(payload.status.value)
    now = datetime.now(timezone.utc)
    purchase.status = new_status
    purchase.admin_comment = payload.admin_comment
    if new_status == PurchaseStatus.approved:
        purchase.delivery_url = await _resolve_delivery_url(purchase.movie_id, payload.delivery_url)
        purchase.delivery_token = payload.delivery_token
    else:
        purchase.delivery_url = None
        purchase.delivery_token = None
    purchase.processed_by = admin_user_id
    purchase.processed_at = now
    purchase.updated_at = now

    await db.commit()
    await db.refresh(purchase)
    await _attach_user_details([purchase])

    user_profile: dict[str, Any] | None = None
    try:
        profile_candidate = await get_user(purchase.user_id)
        if isinstance(profile_candidate, dict):
            user_profile = profile_candidate
    except Exception:
        user_profile = None

    purchase_payload = _purchase_to_payload(purchase)
    if new_status == PurchaseStatus.approved:
        await _send_purchase_approved_notification(purchase_payload, user_profile=user_profile)
    else:
        await _send_purchase_rejected_notification(purchase_payload, user_profile=user_profile)

    return PurchaseOut(**purchase_payload)


