import logging
from typing import Iterable

import httpx

from app.settings import EMAIL_SERVICE_URL

logger = logging.getLogger(__name__)


async def send_template_email(
    to_email: str,
    subject: str,
    template_name: str,
    context: dict | None = None,
    *,
    timeout: float = 10.0,
) -> None:
    """Queue e-mail via email-service; log and swallow failures."""
    if not to_email:
        logger.warning("Skip email send: missing recipient for %s", template_name)
        return

    payload = {
        "to_email": to_email,
        "subject": subject,
        "template_name": template_name,
        "context": context or {},
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(f"{EMAIL_SERVICE_URL}/send-email", json=payload)
            if response.status_code != 200:
                logger.error(
                    "Email service responded %s for %s: %s",
                    response.status_code,
                    to_email,
                    response.text,
                )
    except Exception:
        logger.exception("Failed to queue email for %s", to_email)


def iter_valid_recipients(recipients: Iterable[str]) -> Iterable[str]:
    for email in recipients:
        if email:
            yield email.strip()


async def send_bulk_template_email(
    recipients: Iterable[str],
    subject: str,
    template_name: str,
    base_context: dict | None = None,
) -> None:
    base_context = base_context or {}
    for email in iter_valid_recipients(recipients):
        await send_template_email(email, subject, template_name, dict(base_context))
