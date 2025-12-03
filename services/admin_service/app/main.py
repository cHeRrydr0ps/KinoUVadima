# app/main.py
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from app.api.v1 import users, movies, genres, tmdb
from app.core.redis import init_redis

# NEW: для автосида жанров
from sqlalchemy import select, func
from app.db.session import get_db, get_async_sessionmaker
from app.models.movie_models import Genre
from app.services.import_genres import import_genres_from_tmdb

app = FastAPI(title="Admin Service")

# Роутеры
app.include_router(movies.router, prefix="/admin/movies", tags=["Movies"])
app.include_router(genres.router, prefix="/admin/genres", tags=["Genres"])
app.include_router(tmdb.router,   prefix="/admin/tmdb",   tags=["TMDB"])
app.include_router(users.router,  prefix="/admin",        tags=["Users"])

# Автосид жанров из TMDB при старте (только если таблица пуста)
@app.on_event("startup")
async def startup_event():
    """Инициализация Redis и автосид жанров"""
    # Инициализируем Redis
    await init_redis()
    
    # Если таблица жанров пуста — один раз импортируем жанры из TMDB
    try:
        async_session = get_async_sessionmaker()
        async with async_session() as db:
            count = await db.scalar(select(func.count(Genre.genre_id)))
            if not count:
                await import_genres_from_tmdb(db, language="ru-RU")
                print("✅ Жанры успешно импортированы из TMDB")
    except Exception as e:
        print(f"⚠️  Не удалось импортировать жанры из TMDB: {e}")
        print("⚠️  Сервис продолжит работу. Жанры можно добавить вручную через админку")


# Кастомный OpenAPI — показываем в Swagger именно Bearer-авторизацию
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version="1.0.0",
        description="Admin Service",
        routes=app.routes,
    )

    # Определяем схемы безопасности
    openapi_schema["components"] = openapi_schema.get("components", {})
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }

    # По умолчанию требуем Bearer для всех ручек (если для какой-то не нужно — убери вручную)
    for path in openapi_schema.get("paths", {}).values():
        for op in path.values():
            op.setdefault("security", []).append({"BearerAuth": []})

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
