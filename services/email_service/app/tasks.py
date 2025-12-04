
import os
import logging
from celery.utils.log import get_task_logger
from celery.exceptions import Retry
from app.core.celery import celery_app
from app.services.mailer import send_email, render_template

logger = get_task_logger(__name__)


TEMPLATE_ALIASES = {
    "admin_notification": "admin_notification.html",
    "approval_notification": "approval_notification.html",
    "rejection_notification": "rejection_notification.html",
    "password_reset": "password_reset.html",
}


def _resolve_template_name(template_name: str) -> str:
    candidate = TEMPLATE_ALIASES.get(template_name, template_name)
    if not candidate.endswith('.html') and not candidate.endswith('.htm'):
        candidate = f"{candidate}.html"
    return candidate

@celery_app.task(
    name="app.tasks.send_email_task",
    bind=True,
    autoretry_for=(Exception,),
    max_retries=5,
    retry_backoff=True,
    retry_jitter=True,
)
def send_email_task(self, to_email: str, subject: str, email_type: str, token: str):
    try:
        if email_type == "verify":
            verify_url = os.getenv("VERIFY_EMAIL_URL", "#")
            html = render_template("email/verify_email.html", {
                "verify_link": f"{verify_url}?token={token}"
            })
        elif email_type == "reset":
            reset_url = os.getenv("RESET_PASSWORD_URL", "#")
            html = render_template("email/reset_password.html", {
                "reset_link": f"{reset_url}?token={token}"
            })
        else:
            logger.error(f"Unknown email_type: {email_type}")
            raise ValueError(f"Unknown email_type: {email_type}")

        send_email(to_email, subject, html)
        logger.info(f"Email sent to {to_email} with type {email_type}")

    except Exception as e:
        logger.exception(f"Failed to send email to {to_email}: {str(e)}")
        raise self.retry(exc=e)

@celery_app.task(
    name="app.tasks.send_template_email",
    bind=True,
    autoretry_for=(Exception,),
    max_retries=5,
    retry_backoff=True,
    retry_jitter=True,
)
def send_template_email(self, to_email: str, subject: str, template_name: str, context: dict | None = None):
    """Send an email using a named HTML template."""
    try:
        context = context or {}
        template_path = _resolve_template_name(template_name)
        html = render_template(template_path, context)

        send_email(to_email, subject, html)
        logger.info(f"Template email sent to {to_email} using template {template_path}")

    except Exception as e:
        logger.exception(f"Failed to send template email to {to_email}: {str(e)}")
        raise self.retry(exc=e)
