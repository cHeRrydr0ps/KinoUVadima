from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserRead, UserListResponse
from app.core.security import decode_token
from app.core.config import COOKIE_ACCESS_NAME
from app.utils.email_utils import send_approval_email, send_rejection_email

router = APIRouter(prefix="/admin", tags=["Admin"])

security = HTTPBearer(auto_error=False)

# Dependency для получения текущего пользователя
async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: AsyncSession = Depends(get_db)
) -> User:
    # Попытка получить токен из заголовка Authorization или из кук
    token = None
    if credentials:
        token = credentials.credentials
    else:
        token = request.cookies.get(COOKIE_ACCESS_NAME)
    
    if not token:
        raise HTTPException(status_code=401, detail="No access token")
    
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        result = await session.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# Dependency для проверки прав администратора
async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуются права администратора"
        )
    return current_user

@router.get("/users", response_model=UserListResponse, summary="Получить список всех пользователей")
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """Получить список всех пользователей с пагинацией"""
    # Получаем общее количество
    count_query = select(User)
    total_result = await session.execute(count_query)
    total = len(total_result.scalars().all())
    
    # Получаем пользователей с пагинацией
    query = select(User).offset(skip).limit(limit).order_by(User.id)
    result = await session.execute(query)
    users = result.scalars().all()
    
    return UserListResponse(users=users, total=total)

@router.get("/users/pending", response_model=List[UserRead], summary="Получить пользователей на модерации")
async def get_pending_users(
    session: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """Получить всех пользователей, ожидающих подтверждения (is_verified=False)"""
    query = select(User).where(User.is_verified == False).order_by(User.id)
    result = await session.execute(query)
    users = result.scalars().all()
    return users

@router.post("/users/{user_id}/approve", response_model=dict, summary="Подтвердить регистрацию пользователя")
async def approve_user(
    user_id: int,
    session: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """Подтвердить регистрацию пользователя и отправить уведомление"""
    # Найти пользователя
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar()
    
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Пользователь уже подтвержден")
    
    # Подтверждаем пользователя
    user.is_verified = True
    await session.commit()
    await session.refresh(user)
    
    # Отправляем уведомление об одобрении
    try:
        await send_approval_email(user)
    except Exception as e:
        print(f"Ошибка отправки email одобрения: {e}")
    
    return {
        "message": f"Пользователь {user.email} успешно подтвержден",
        "user_id": user_id,
        "status": "approved"
    }

@router.post("/users/{user_id}/reject", response_model=dict, summary="Отклонить регистрацию пользователя")
async def reject_user(
    user_id: int,
    reason: str = "Не указана",
    session: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """Отклонить регистрацию пользователя и отправить уведомление"""
    # Найти пользователя
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar()
    
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Нельзя отклонить уже подтвержденного пользователя")
    
    # Отправляем уведомление об отклонении
    try:
        await send_rejection_email(user, reason)
    except Exception as e:
        print(f"Ошибка отправки email отклонения: {e}")
    
    # Удаляем пользователя
    await session.delete(user)
    await session.commit()
    
    return {
        "message": f"Регистрация пользователя {user.email} отклонена",
        "user_id": user_id,
        "reason": reason,
        "status": "rejected"
    }

@router.get("/users/{user_id}", response_model=UserRead, summary="Получить пользователя по ID")
async def get_user_by_id(
    user_id: int,
    session: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """Получить конкретного пользователя по ID"""
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar()
    
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    return user