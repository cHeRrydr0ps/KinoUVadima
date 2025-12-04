# -*- coding: utf-8 -*-
"""
Security for auth_service — production-ready.

- Password hashing (passlib/bcrypt; fallback to sha256 for dev)
- Internal secret guard (require_internal_secret, verify_internal_secret)
- First-class JWT helpers implemented здесь (без прокси):
  create_access_token, create_refresh_token, verify_refresh_token, decode_token,
  create_email_verification_token, verify_email_verification_token,
  create_password_reset_token, verify_password_reset_token
"""
from __future__ import annotations

import os
from typing import Optional, Any, Dict
from datetime import datetime, timedelta, timezone

from fastapi import Header, HTTPException, status, Request
from jose import jwt, JWTError

# -------- Password hashing ----------
try:
    from passlib.context import CryptContext  # type: ignore
    _pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    def get_password_hash(password: str) -> str:
        return _pwd_ctx.hash(password)
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        try:
            return _pwd_ctx.verify(plain_password, hashed_password)
        except Exception:
            return False
except Exception:
    import hashlib, hmac
    def get_password_hash(password: str) -> str:
        return "sha256$" + hashlib.sha256(password.encode("utf-8")).hexdigest()
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        prefix = "sha256$"
        if not hashed_password.startswith(prefix):
            return False
        digest = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
        return hmac.compare_digest(prefix + digest, hashed_password)

# -------- Settings (env) ----------
SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))
EMAIL_TOKEN_EXPIRE_HOURS = int(os.getenv("EMAIL_TOKEN_EXPIRE_HOURS", 24))
RESET_TOKEN_EXPIRE_HOURS = int(os.getenv("RESET_TOKEN_EXPIRE_HOURS", 1))

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

def _encode(payload: Dict[str, Any], expires_delta: timedelta) -> str:
    to_encode = payload.copy()
    now = _utcnow()
    to_encode.update({"iat": int(now.timestamp()), "exp": int((now + expires_delta).timestamp())})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as e:
        raise ValueError(str(e))

# -------- Access / Refresh ----------
def create_access_token(user_id: int | str, role: str) -> str:
    return _encode({"sub": str(user_id), "role": role, "type": "access"},
                   timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

def create_refresh_token(user_id: int | str, expire_days: int = None) -> str:
    if expire_days is None:
        expire_days = REFRESH_TOKEN_EXPIRE_DAYS
    return _encode({"sub": str(user_id), "type": "refresh"},
                   timedelta(days=expire_days))

def verify_refresh_token(token: str) -> str:
    data = decode_token(token)
    if data.get("type") != "refresh":
        raise ValueError("Not a refresh token")
    return str(data.get("sub"))

# -------- Email verification ----------
def create_email_verification_token(email: str) -> str:
    return _encode({"sub": email, "type": "email-verify"},
                   timedelta(hours=EMAIL_TOKEN_EXPIRE_HOURS))

def verify_email_verification_token(token: str) -> str:
    data = decode_token(token)
    if data.get("type") != "email-verify":
        raise ValueError("Invalid email verification token")
    return str(data.get("sub"))

# -------- Password reset ----------
def create_password_reset_token(email: str) -> str:
    return _encode({"sub": email, "type": "password-reset"},
                   timedelta(hours=RESET_TOKEN_EXPIRE_HOURS))

def verify_password_reset_token(token: str) -> str:
    data = decode_token(token)
    if data.get("type") != "password-reset":
        raise ValueError("Invalid password reset token")
    return str(data.get("sub"))

# -------- Internal secret guard ----------
INTERNAL_SECRET_EXPECTED = os.getenv("INTERNAL_SECRET") or os.getenv("AUTH_INTERNAL_SECRET") or ""

async def require_internal_secret(
    request: Request,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
) -> None:
    expected = INTERNAL_SECRET_EXPECTED
    if not expected:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Internal access disabled")
    provided = x_internal_secret or request.headers.get("X-Internal-Secret") or request.headers.get("x-internal-secret")
    if provided != expected:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

# Backward-compatible alias
async def verify_internal_secret(
    request: Request,
    x_internal_secret: Optional[str] = Header(None, alias="X-Internal-Secret"),
) -> None:
    val = x_internal_secret or request.headers.get("x-internal-secret") or request.headers.get("X-Internal-Secret")
    return await require_internal_secret(request, val)

__all__ = [
    # hashing
    "get_password_hash", "verify_password",
    # jwt
    "create_access_token", "create_refresh_token", "verify_refresh_token", "decode_token",
    "create_email_verification_token", "verify_email_verification_token",
    "create_password_reset_token", "verify_password_reset_token",
    # internal
    "require_internal_secret", "verify_internal_secret",
]
