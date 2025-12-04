from fastapi import Response
import os

COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN")  # may be None
ACCESS_TTL_MIN = int(os.getenv("ACCESS_TTL_MIN", "30"))
REFRESH_TTL_DAYS = int(os.getenv("REFRESH_TTL_DAYS", "7"))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() in ("1","true","yes","on")
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").capitalize()  # Lax/None/Strict

def _effective_domain():
    # Do NOT set Domain attribute for localhost/127.0.0.1 — browsers drop such cookies
    if not COOKIE_DOMAIN or COOKIE_DOMAIN in ("localhost", "127.0.0.1"):
        return None
    return COOKIE_DOMAIN

def set_auth_cookies(resp: Response, access_token: str, refresh_token: str):
    domain = _effective_domain()
    resp.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=domain,
        path="/",
        max_age=ACCESS_TTL_MIN * 60,
    )
    resp.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=domain,
        path="/",
        max_age=REFRESH_TTL_DAYS * 24 * 60 * 60,
    )

def clear_auth_cookies(resp: Response):
    domain = _effective_domain()
    resp.delete_cookie("access_token", path="/", domain=domain)
    resp.delete_cookie("refresh_token", path="/", domain=domain)
