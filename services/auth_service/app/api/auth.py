from fastapi import APIRouter, Depends, HTTPException, status, Form, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional

from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserRead, ProfileUpdateIn, TokenResponse
from app.core.config import (
    COOKIE_DOMAIN, COOKIE_SECURE, COOKIE_SAMESITE,
    COOKIE_ACCESS_NAME, COOKIE_REFRESH_NAME
)
from app.core.security import (
    get_password_hash, verify_password,
    create_access_token, create_refresh_token,
    verify_refresh_token, create_email_verification_token,
    verify_email_verification_token,
    create_password_reset_token, verify_password_reset_token,
    decode_token
)
from app.services.email_client import send_email_async
from app.utils.email_utils import send_admin_notification
from app.core.redis import set_refresh_token, get_refresh_token, delete_refresh_token

router = APIRouter()
# auto_error=False — чтобы /me мог читать токен из cookie, а не падал, если нет Authorization
bearer = HTTPBearer(auto_error=False)

# ---------------------------
# Cookies helpers
# ---------------------------
def _effective_domain():
    if not COOKIE_DOMAIN or COOKIE_DOMAIN in ("localhost", "127.0.0.1"):
        return None
    return COOKIE_DOMAIN

def set_auth_cookies(response: Response, access_token: str, refresh_token: str, max_age: int = None):
    print(f"🔧 set_auth_cookies called with max_age={max_age}")
    print(f"🔧 Cookie config: secure={COOKIE_SECURE}, samesite={COOKIE_SAMESITE}, domain={_effective_domain()}")
    
    response.set_cookie(
        COOKIE_ACCESS_NAME, access_token,
        httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE,
        domain=_effective_domain(), path="/", max_age=max_age
    )
    response.set_cookie(
        COOKIE_REFRESH_NAME, refresh_token,
        httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE,
        domain=_effective_domain(), path="/", max_age=max_age
    )
    print(f"✅ Cookies set with max_age={max_age}")

def clear_auth_cookies(response: Response):
    response.delete_cookie(COOKIE_ACCESS_NAME, domain=_effective_domain(), path="/")
    response.delete_cookie(COOKIE_REFRESH_NAME, domain=_effective_domain(), path="/")


@router.post("/login", response_model=TokenResponse, summary="Авторизация пользователя")
async def login(
    user_credentials: UserLogin, 
    response: Response,
    session: AsyncSession = Depends(get_db)
):
    print(f"🔍 Login attempt: email={user_credentials.email}, remember={user_credentials.remember}")
    
    result = await session.execute(
        select(User).where(
            (User.email == user_credentials.email) | (User.inn == user_credentials.email)
        )
    )
    user = result.scalar()

    if not user or not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Проверяем модерацию
    if not user.is_verified:
        raise HTTPException(
            status_code=403, 
            detail={
                "error": "registration_pending",
                "message": "Ваша учетная запись на модерации. Ожидайте подтверждения в течение 72 часов."
            }
        )

    if user.is_blocked:
        raise HTTPException(status_code=403, detail="User is blocked")

    # Создаем access и refresh токены
    access_token = create_access_token(user.id, user.role)
    
    # Если "Запомнить меня" отмечено - увеличиваем время жизни refresh токена
    refresh_expire_days = 30 if user_credentials.remember else 7
    refresh_token = create_refresh_token(user.id, expire_days=refresh_expire_days)

    print(f"🎯 Remember me logic: remember={user_credentials.remember}, refresh_expire_days={refresh_expire_days}")

    # Устанавливаем куки с правильным временем жизни
    if user_credentials.remember:
        # Постоянные куки (30 дней)
        cookie_max_age = 30 * 24 * 60 * 60  # 30 дней в секундах
        print(f"🍪 Setting persistent cookies with max_age={cookie_max_age} seconds")
    else:
        # Сессионные куки (до закрытия браузера)
        cookie_max_age = None
        print(f"🍪 Setting session cookies (max_age=None)")

    # Устанавливаем куки с учетом параметра remember
    set_auth_cookies(response, access_token, refresh_token, max_age=cookie_max_age)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me")
async def get_me(
    request: Request,
    session: AsyncSession = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
):
    token = credentials.credentials if credentials else request.cookies.get(COOKIE_ACCESS_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="No access token")
    try:
        payload = decode_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # ВЫТЯГИВАЕМ ПОЛЬЗОВАТЕЛЯ ИЗ БД
    result = await session.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Возвращаем полный профиль; оставляем совместимые поля
    return {
        "id": user.id,
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "inn": user.inn,
        "role": payload.get("role", user.role),
        "is_blocked": user.is_blocked,
        "is_verified": user.is_verified,
    }



@router.put("/profile", response_model=UserRead, summary="Обновить профиль текущего пользователя (имя)")
async def update_profile(
    update: ProfileUpdateIn,
    request: Request,
    session: AsyncSession = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
):
    # Достаём токен как и в /me
    token = credentials.credentials if credentials else request.cookies.get(COOKIE_ACCESS_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="No access token")
    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Склеиваем имя
    new_name = None
    if update.name is not None:
        new_name = update.name.strip()
    else:
        first = (update.firstName or "").strip()
        last = (update.lastName or "").strip()
        combined = f"{first}{last}"
        new_name = combined

    if not new_name:
        raise HTTPException(status_code=422, detail="Имя не должно быть пустым")
    result = await session.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.name = new_name
    await session.commit()
    await session.refresh(user)

    return {
        "id": user.id,
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "inn": user.inn,
        "role": payload.get("role", user.role),
        "is_blocked": user.is_blocked,
        "is_verified": user.is_verified,
    }
# =========================================================
# Остальные ручки сервиса
# =========================================================

@router.post("/register", response_model=dict, summary="Регистрация пользователя")
async def register(user: UserCreate, session: AsyncSession = Depends(get_db)):
    # Проверка дубля email
    result = await session.execute(select(User).where(User.email == user.email))
    if result.scalar():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Создание пользователя с is_verified=False
    new_user = User(
        inn=user.inn,
        name=user.name,
        email=user.email,
        password_hash=get_password_hash(user.password),
        is_verified=False,  # Остается False до модерации
        role="user",
        is_blocked=False,
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    # Отправляем уведомление админу о новой регистрации
    try:
        await send_admin_notification(new_user)
    except Exception as e:
        # Не ломаем регистрацию, если почта недоступна
        print(f"Ошибка отправки уведомления админу: {e}")

    # НЕ возвращаем токены - возвращаем статус ожидания
    return {
        "message": "Регистрация принята. Ожидайте подтверждения в течение 72 часов.",
        "status": "pending_verification"
    }


@router.post("/token", summary="OAuth2 Password Token (form) [DEPRECATED for cookies]")
async def oauth2_token(response: Response, form: OAuth2PasswordRequestForm = Depends(), session: AsyncSession = Depends(get_db)):
    # form.username — это email
    result = await session.execute(select(User).where(User.email == form.username))
    user = result.scalar()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified")

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)
    await set_refresh_token(str(user.id), refresh_token)
    set_auth_cookies(response, access_token, refresh_token)

    # Для обратной совместимости вернём access в теле
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/verify-email", summary="Подтверждение почты")
async def verify_email(token: str, session: AsyncSession = Depends(get_db)):
    try:
        email = verify_email_verification_token(token)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        return {"message": "Email already verified"}

    user.is_verified = True
    await session.commit()
    return {"message": "Email successfully verified"}


@router.post("/refresh", summary="Обновление токенов (по refresh cookie)")
async def refresh_token_endpoint(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db)
):
    cookie_token: Optional[str] = request.cookies.get(COOKIE_REFRESH_NAME)
    if not cookie_token:
        raise HTTPException(status_code=401, detail="No refresh token cookie")

    try:
        user_id = verify_refresh_token(cookie_token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    stored = await get_refresh_token(str(user_id))
    if stored != cookie_token:
        raise HTTPException(status_code=401, detail="Refresh token mismatch")

    result = await session.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_access = create_access_token(user.id, user.role)
    new_refresh = create_refresh_token(user.id)
    await set_refresh_token(str(user.id), new_refresh)

    set_auth_cookies(response, new_access, new_refresh)
    return {"ok": True}


@router.post("/request-password-reset", summary="Запрос на сброс пароля")
async def request_password_reset(email: str = Form(...), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar()
    if not user:
        # Чтобы не палить, что email не существует, можно вернуть 200
        raise HTTPException(status_code=404, detail="User not found")

    token = create_password_reset_token(email)
    try:
        maybe_coro = send_email_async(email, "Сброс пароля", "reset", token)
        if hasattr(maybe_coro, "__await__"):
            await maybe_coro
    except Exception:
        pass
    return {"message": "Password reset email sent"}


@router.post("/reset-password", summary="Сброс пароля")
async def reset_password(token: str = Form(...), new_password: str = Form(...), session: AsyncSession = Depends(get_db)):
    try:
        email = verify_password_reset_token(token)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = get_password_hash(new_password)
    await session.commit()
    return {"message": "Password has been reset successfully"}


@router.post("/logout", summary="Выход из системы (чистим cookie)")
async def logout(request: Request, response: Response):
    cookie_token = request.cookies.get(COOKIE_REFRESH_NAME)
    if cookie_token:
        try:
            user_id = verify_refresh_token(cookie_token)
            await delete_refresh_token(str(user_id))
        except Exception:
            # даже если не удалось удалить в redis — чистим куки
            pass
    clear_auth_cookies(response)
    return {"ok": True}
