import os
import httpx
from typing import Literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select  # оставляю как у тебя, совместимо
from sqlalchemy.exc import IntegrityError

from app.models.movie_models import Genre

TMDB_BEARER_TOKEN = os.getenv("TMDB_BEARER_TOKEN")
TMDB_BASE_URL = os.getenv("TMDB_BASE_URL", "https://api.themoviedb.org/3")

HEADERS = {
    "Authorization": f"Bearer {TMDB_BEARER_TOKEN}",
    "Accept": "application/json",
}

Language = Literal["ru-RU", "en-US", "uk-UA", "de-DE", "fr-FR"]


def _normalize_name_ru(name: str) -> str:
    """
    Минимальная нормализация под русский:
    - trim
    - схлопнуть множественные пробелы
    - сделать заглавной ПЕРВУЮ букву всей строки
    (не делаем Title Case по словам, чтобы не портить составные названия)
    """
    s = (name or "").strip()
    if not s:
        return s
    s = " ".join(s.split())
    return s[:1].upper() + s[1:]


async def import_genres_from_tmdb(db: AsyncSession, language: Language = "ru-RU") -> int:
    """
    Импорт жанров из TMDb в таблицу `genre` (legacy оффлайн-кино) БЕЗ изменения схемы.
    - Тянем /genre/movie/list?language=ru-RU (по умолчанию)
    - Кладём имя в колонку `name` уже в нормализованном виде (первая буква заглавная)
    - Дедуп по нижнему регистру
    - Если запись уже есть, но отличается регистром/пробелами — ОБНОВЛЯЕМ её имя (чтобы был единый стиль)
    Возвращаем количество ДОБАВЛЕННЫХ записей (обновления в счёт не идут).
    """
    if not TMDB_BEARER_TOKEN:
        raise RuntimeError("TMDB_BEARER_TOKEN is not set")

    # 1) TMDb запрос
    params = {"language": language}
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(
            f"{TMDB_BASE_URL}/genre/movie/list",
            headers=HEADERS,
            params=params,
        )
        r.raise_for_status()
        data = r.json()
        genres = data.get("genres", []) or []

    # 2) Загружаем существующие жанры и строим индекс по lowercase имени
    res = await db.execute(select(Genre))
    existing_rows = list(res.scalars())
    existing_by_lc = { (g.name or "").strip().lower(): g for g in existing_rows }

    added = 0
    updated = 0

    # 3) Нормализация и upsert (без реального UPSERT — через проверку)
    for g in genres:
        raw_name = (g or {}).get("name") or ""
        norm_name = _normalize_name_ru(raw_name)
        if not norm_name:
            continue

        key = norm_name.lower()
        row = existing_by_lc.get(key)

        if row is not None:
            # Уже есть жанр с тем же именем по lower() — при необходимости правим формат
            current_norm = _normalize_name_ru(row.name or "")
            if row.name != current_norm:
                row.name = current_norm
                updated += 1
            continue

        # Нет такого ключа — создаём новую запись
        new_row = Genre(name=norm_name)
        db.add(new_row)
        existing_by_lc[key] = new_row
        added += 1

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        # Скорее всего, конфликт уникальности по name — пробрасываем выше для явной диагностики
        raise e

    # Можно вернуть added + updated, но чтобы не ломать совместимость — оставляем только added
    return added
