from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, internal_users, admin
from app.models.user import Base
from app.db.database import engine

app = FastAPI(
    title="Auth Service",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS — если нужен ограниченный список, поменяй на конкретные origin'ы
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Группа внутренних ручек
internal_router = APIRouter(prefix="/internal", tags=["internal"])
internal_router.include_router(internal_users.router)

# Подключение роутеров
app.include_router(internal_router)
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(admin.router, prefix="/auth", tags=["Admin"])

@app.on_event("startup")
async def on_startup():
    # создаём таблицы если их нет
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
