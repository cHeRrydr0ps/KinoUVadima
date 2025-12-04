
from fastapi import FastAPI
from app.api.v1 import movies
from app.models.movie import Movie, Genre  # Импортируем модель

app = FastAPI(title="Content Service")

@app.on_event("startup")
async def startup_event():
    """Content service подключается к уже существующей базе admin_service"""
    print("✅ Content Service подключен к общей базе данных")

app.include_router(movies.router, prefix="/api/v1")
