import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@postgres:5432/payments")
SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
SUBSCRIPTION_SERVICE_URL = os.getenv("SUBSCRIPTION_SERVICE_URL", "http://subscription_service:8000")
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth_service:8000")
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "dev-internal")
PROVIDER = os.getenv("PAYMENT_PROVIDER", "mock")

# recurring / scheduler
ENABLE_BILLING_SCHEDULER = os.getenv("ENABLE_BILLING_SCHEDULER", "false").lower() in {"1","true","yes"}



def _split_emails(raw: str) -> list[str]:
    return [item.strip() for item in raw.split(',') if item.strip()]


EMAIL_SERVICE_URL = os.getenv("EMAIL_SERVICE_URL", "http://email_service:8003")
PAYMENT_ADMIN_EMAILS = _split_emails(os.getenv("PAYMENT_ADMIN_EMAILS", os.getenv("ADMIN_EMAIL", "")))
PHONE_PAYMENT_NUMBER = os.getenv("PHONE_PAYMENT_NUMBER", "+7 (900) 123-45-67")
INVOICE_DETAILS = os.getenv("INVOICE_DETAILS", """ООО «Кино у Вадима»
ИНН 7701234567, КПП 770101001
р/с 40702810900000000001 в банке «Пример», БИК 044525225""")
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", os.getenv("ADMIN_EMAIL", "support@cinestream.local"))
_frontend_base = os.getenv("FRONTEND_BASE_URL", "http://localhost").rstrip("/")
ADMIN_PORTAL_URL = os.getenv("ADMIN_PORTAL_URL", f"{_frontend_base}/admin")
USER_PORTAL_URL = os.getenv("USER_PORTAL_URL", f"{_frontend_base}/profile")
PROJECT_NAME = os.getenv("PROJECT_NAME", "Кино у Вадима")


CONTENT_SERVICE_URL = os.getenv("CONTENT_SERVICE_URL", "http://content_service:8000")

