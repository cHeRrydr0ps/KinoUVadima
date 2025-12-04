from typing import Optional, List
from pydantic import BaseModel, EmailStr, constr

# Pydantic v2 style validators
try:
    from pydantic import field_validator
except Exception:  # fallback for very old Pydantic (unlikely)
    def field_validator(*args, **kwargs):  # type: ignore
        def deco(fn):
            return fn
        return deco

# --- Input Schemas ---

class UserCreate(BaseModel):
    inn: constr(min_length=10, max_length=12)
    name: constr(strip_whitespace=True, min_length=1, max_length=50)
    email: EmailStr
    password: constr(min_length=8, max_length=30)

    @field_validator("inn")
    @classmethod
    def _inn_digits_len(cls, v: str):
        v = (v or "").strip()
        if not v.isdigit() or not (10 <= len(v) <= 12):
            raise ValueError("Введите корректный ИНН (10–12 цифр)")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: constr(min_length=1)
    remember: bool = False

class ProfileUpdateIn(BaseModel):
    # В коде auth.py обращаются к update.name, update.firstName, update.lastName,
    # поэтому оставляем имена полей в camelCase, без алиасов.
    name: Optional[constr(strip_whitespace=True, min_length=1, max_length=50)] = None
    firstName: Optional[constr(strip_whitespace=True, min_length=0, max_length=50)] = None
    lastName: Optional[constr(strip_whitespace=True, min_length=0, max_length=50)] = None

# --- Output / shared Schemas ---

class UserRead(BaseModel):
    id: int
    inn: Optional[str] = None
    name: str
    email: EmailStr
    role: Optional[str] = None
    is_blocked: bool
    is_verified: bool

    class Config:
        from_attributes = True  # pydantic v2 replacement for orm_mode

class UserUpdate(BaseModel):
    role: Optional[str] = None
    is_blocked: Optional[bool] = None
    name: Optional[constr(strip_whitespace=True, min_length=1, max_length=50)] = None

class UserListResponse(BaseModel):
    users: List[UserRead]
    total: int

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserRead
