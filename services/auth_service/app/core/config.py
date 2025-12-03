from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

# Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Cookie config
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN", None)  # например, ".example.com" на проде; для локали — None
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"  # true на проде за https
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "Lax")  # 'Lax' (реком.), 'Strict', или 'None' (требует SECURE)
COOKIE_ACCESS_NAME = os.getenv("COOKIE_ACCESS_NAME", "access_token")
COOKIE_REFRESH_NAME = os.getenv("COOKIE_REFRESH_NAME", "refresh_token")

# Email config
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "deagle-desert@mail.ru")
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "annnt9na@yandex.ru")
FROM_EMAIL = os.getenv("FROM_EMAIL", "annnt9na@yandex.ru")
EMAIL_SERVICE_URL = os.getenv("EMAIL_SERVICE_URL", "http://email_service:8003")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost")
