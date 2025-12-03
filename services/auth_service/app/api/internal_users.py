from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, func
from typing import Optional

from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate, UserListResponse

router = APIRouter(prefix="/users", tags=["internal-users"])

@router.get("", response_model=UserListResponse, summary="Получить список пользователей")
async def list_users(
    db: AsyncSession = Depends(get_db),
    q: Optional[str] = Query(None, description="Поиск по имени/email/ИНН"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    query = select(User)
    if q:
        like = f"%{q.lower()}%"
        query = query.where(or_(func.lower(User.name).like(like), func.lower(User.email).like(like), User.inn.like(f"%{q}%")))
    total = (await db.execute(select(func.count()).select_from(User))).scalar()
    users = (await db.execute(query.order_by(User.id.desc()).limit(limit).offset(offset))).scalars().all()
    return {"users": users, "total": total}

@router.patch("/{user_id}", response_model=UserRead, summary="Обновить пользователя по ID")
async def update_user(user_id: int, update: UserUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = update.dict(exclude_unset=True)
    for k, v in data.items():
        setattr(user, k, v)
    await db.commit()
    await db.refresh(user)
    return user

@router.get("/{user_id}", response_model=UserRead, summary="Get user by ID")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
