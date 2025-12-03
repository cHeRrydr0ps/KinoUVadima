import json
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional
from redis import asyncio as aioredis
from redis.asyncio import Redis

redis_client: Optional[Redis] = None

class DecimalEncoder(json.JSONEncoder):
    """Кастомный JSON encoder для работы с Decimal"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

async def init_redis() -> Redis:
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url("redis://redis:6379/0")
    return redis_client

async def get_redis() -> Redis:
    if redis_client is None:
        await init_redis()
    return redis_client

async def publish_movie_event(
    movie_id: int,
    event_type: str,
    data: Optional[dict[str, Any]] = None
) -> None:
    """Публикует событие об изменении фильма в Redis

    Args:
        movie_id: ID фильма
        event_type: Тип события ("created", "updated", "deleted")
        data: Дополнительные данные о фильме (для created/updated)
    """
    event = {
        "movie_id": movie_id,
        "event_type": event_type,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data
    }
    
    redis = await get_redis()
    await redis.publish("movie_events", json.dumps(event, cls=DecimalEncoder))
