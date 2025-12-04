import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape

env = Environment(
    loader=FileSystemLoader("app/templates"),
    autoescape=select_autoescape(["html", "xml"]),
)


def render_template(template_name: str, context: dict) -> str:
    template = env.get_template(template_name)
    return template.render(**context)


def _connect_and_send(
    *,
    smtp_host: str,
    smtp_port: int,
    smtp_user: Optional[str],
    smtp_password: Optional[str],
    msg: MIMEMultipart,
    use_ssl: bool,
):
    """Send message using either SSL (465) or STARTTLS (587)."""
    if use_ssl:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context, timeout=10) as server:
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.send_message(msg)
    else:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls(context=ssl.create_default_context())
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.send_message(msg)


def send_email(to_email: str, subject: str, html_content: str):
    smtp_host = os.getenv("SMTP_HOST") or ""
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    email_from = os.getenv("SMTP_FROM_EMAIL") or ""

    msg = MIMEMultipart()
    msg["From"] = email_from
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_content, "html"))

    # Prefer STARTTLS unless explicitly asked for SSL or port 465 is used.
    use_ssl = os.getenv("SMTP_USE_SSL", "").lower() in {"1", "true", "yes"} or smtp_port == 465

    try:
        _connect_and_send(
            smtp_host=smtp_host,
            smtp_port=smtp_port,
            smtp_user=smtp_user,
            smtp_password=smtp_password,
            msg=msg,
            use_ssl=use_ssl,
        )
    except Exception as ssl_err:
        # If SSL handshake fails (common when port/flag mismatch), retry with STARTTLS on 587.
        if use_ssl:
            try:
                _connect_and_send(
                    smtp_host=smtp_host,
                    smtp_port=587,
                    smtp_user=smtp_user,
                    smtp_password=smtp_password,
                    msg=msg,
                    use_ssl=False,
                )
                return
            except Exception:
                raise ssl_err
        raise
