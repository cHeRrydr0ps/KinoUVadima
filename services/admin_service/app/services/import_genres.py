import os
import httpx
from typing import Literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select  # Р?С?С'Р°Р?Р>С?С? РєР°Рє С? С'РчР+С?, С?Р?Р?Р?РчС?С'РёР?Р?
from sqlalchemy.exc import IntegrityError

from app.models.movie_models import Genre

POISKKINO_API_KEY = os.getenv("POISKKINO_API_KEY") or os.getenv("POISKKINO_KEY")
POISKKINO_BASE_URL = os.getenv("POISKKINO_BASE_URL", "https://api.poiskkino.dev")

HEADERS = {
    "X-API-KEY": POISKKINO_API_KEY or "",
    "Accept": "application/json",
}

Language = Literal["ru-RU", "en-US", "uk-UA", "de-DE", "fr-FR"]


def _normalize_name_ru(name: str) -> str:
    """
    Р?РёР?РёР?Р°Р>С?Р?Р°С? Р?Р?С?Р?Р°Р>РёР·Р°С┼РёС? РїР?Р? С?С?С?С?РєРёР№:
    - trim
    - С?С:Р>Р?РїР?С?С'С? Р?Р?Р?РРчС?С'Р?РчР?Р?С<Рч РїС?Р?Р+РчР>С<
    - С?Р?РчР>Р°С'С? Р·Р°Р?Р>Р°Р?Р?Р?Р№ Р?РР Р'Р?РR Р+С?РєР?С? Р?С?РчР№ С?С'С?Р?РєРё
    (Р?Рч Р?РчР>Р°РчР? Title Case РїР? С?Р>Р?Р?Р°Р?, С╪С'Р?Р+С< Р?Рч РїР?С?С'РёС'С? С?Р?С?С'Р°Р?Р?С<Рч Р?Р°Р·Р?Р°Р?РёС?)
    """
    s = (name or "").strip()
    if not s:
        return s
    s = " ".join(s.split())
    return s[:1].upper() + s[1:]


async def import_genres_from_tmdb(db: AsyncSession, language: Language = "ru-RU") -> int:
    """
    Р?Р?РїР?С?С' РР°Р?С?Р?Р? РёР· PoiskKino Р? С'Р°Р+Р>РёС┼С? `genre` (legacy Р?С"С"Р>Р°Р№Р?-РєРёР?Р?) Р'РР- РёР·Р?РчР?РчР?РёС? С?С:РчР?С<.
    - /v1/movie/possible-values-by-field?field=genres.name
    - Р?Р>Р°Р?С'Р? РёР?С? Р? РєР?Р>Р?Р?РєС? `name` С?РРч Р? Р?Р?С?Р?Р°Р>РёР·Р?Р?Р°Р?Р?Р?Р? Р?РёР?Рч
    - Р"РчР?С?Рї РїР? Р?РёРР?РчР?С? С?РчР?РёС?С'С?С?
    - РС?Р>Рё Р·Р°РїРёС?С? С?РРч РчС?С'С?, Р?Р? Р?С'Р>РёС╪Р°РчС'С?С? С?РчР?РёС?С'С?Р?Р?/РїС?Р?Р+РчР>Р°Р?Рё в?" Р?Р'Р?Р?Р'Р>РЇРР? РчС' РёР?С?
    Р'Р?Р·Р?С?Р°С%Р°РчР? РєР?Р>РёС╪РчС?С'Р?Р? Р"Р?Р'Р?Р'Р>РР?Р?Р<Р? Р·Р°РїРёС?РчР№ (Р?Р+Р?Р?Р?Р>РчР?РёС? Р? С?С╪С'С' Р?Рч РёР?С?С').
    """
    if not POISKKINO_API_KEY:
        raise RuntimeError("POISKKINO_API_KEY is not set")

    # 1) PoiskKino Р·Р°РїС?Р?С?
    params = {"field": "genres.name"}
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(
            f"{POISKKINO_BASE_URL.rstrip('/')}/v1/movie/possible-values-by-field",
            headers=HEADERS,
            params=params,
        )
        r.raise_for_status()
        data = r.json()
        genres = data or []

    # 2) Р-Р°Р?С?С?РР°РчР? С?С?С%РчС?С'Р?С?С?С%РёРч РР°Р?С?С< Рё С?С'С?Р?РёР? РёР?Р?РчРєС? РїР? lowercase РёР?РчР?Рё
    res = await db.execute(select(Genre))
    existing_rows = list(res.scalars())
    existing_by_lc = { (g.name or "").strip().lower(): g for g in existing_rows }

    added = 0
    updated = 0

    # 3) Р?Р?С?Р?Р°Р>РёР·Р°С┼РёС? Рё upsert (Р+РчР· С?РчР°Р>С?Р?Р?Р?Р? UPSERT в?" С╪РчС?РчР· РїС?Р?Р?РчС?РєС?)
    for g in genres:
        raw_name = (g or {}).get("name") or ""
        norm_name = _normalize_name_ru(raw_name)
        if not norm_name:
            continue

        key = norm_name.lower()
        row = existing_by_lc.get(key)

        if row is not None:
            # Р?РРч РчС?С'С? РР°Р?С? С? С'РчР? РРч РёР?РчР?РчР? РїР? lower() в?" РїС?Рё Р?РчР?Р+С:Р?Р?РёР?Р?С?С'Рё РїС?Р°Р?РёР? С"Р?С?Р?Р°С'
            current_norm = _normalize_name_ru(row.name or "")
            if row.name != current_norm:
                row.name = current_norm
                updated += 1
            continue

        # Р?РчС' С'Р°РєР?Р?Р? РєР>С?С╪Р° в?" С?Р?Р·Р?Р°С'Р? Р?Р?Р?С?С? Р·Р°РїРёС?Рч
        new_row = Genre(name=norm_name)
        db.add(new_row)
        existing_by_lc[key] = new_row
        added += 1

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        # РЎРєР?С?РчРч Р?С?РчР?Р?, РєР?Р?С"Р>РёРєС' С?Р?РёРєР°Р>С?Р?Р?С?С'Рё РїР? name в?" РїС?Р?Р+С?Р°С?С<Р?Р°РчР? Р?С<С?Рч Р?Р>С? С?Р?Р?Р?Р№ Р?РёР°Р?Р?Р?С?С'РёРєРё
        raise e

    # Р?Р?РР?Р? Р?РчС?Р?С?С'С? added + updated, Р?Р? С╪С'Р?Р+С< Р?Рч Р>Р?Р?Р°С'С? С?Р?Р?Р?РчС?С'РёР?Р?С?С'С? в?" Р?С?С'Р°Р?Р>С?РчР? С'Р?Р>С?РєР? added
    return added
