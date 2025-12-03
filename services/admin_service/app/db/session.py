import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base

Base = declarative_base()

def _build_db_url():
    url = os.getenv("DATABASE_URL", "").strip()
    if url:
        return url
    user = os.getenv("POSTGRES_USER_ADMIN_SERVICE", "admin_user")
    pwd  = os.getenv("POSTGRES_PASSWORD_ADMIN_SERVICE", "admin_pass")
    db   = os.getenv("POSTGRES_DB_ADMIN_SERVICE", "admin_db")
    host = os.getenv("POSTGRES_HOST_ADMIN_SERVICE", "db_admin")
    port = os.getenv("POSTGRES_PORT_ADMIN_SERVICE", "5432")
    if host in {"db_admin","db","postgres","admin_db"} and not os.getenv("FORCE_EXTERNAL_DB"):
        port = "5432"
    # Alembic/env expects async driver
    return f"postgresql+asyncpg://{user}:{pwd}@{host}:{port}/{db}"

DATABASE_URL = _build_db_url()

def get_async_sessionmaker():
    engine = create_async_engine(DATABASE_URL, echo=True, pool_pre_ping=True, future=True)
    return sessionmaker(bind=engine, class_=AsyncSession, autoflush=False, autocommit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async_session = get_async_sessionmaker()
    async with async_session() as session:
        yield session
