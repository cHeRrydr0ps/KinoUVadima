import json
import asyncio
from datetime import datetime
from typing import Any, Optional, Callable
import redis.asyncio as aioredis
from redis.asyncio import Redis

redis_client: Optional[Redis] = None

async def init_redis() -> Redis:
    global redis_client
    if redis_client is None:
        redis_client = await aioredis.from_url("redis://redis:6379/0")
    return redis_client

async def get_redis() -> Redis:
    if redis_client is None:
        await init_redis()
    return redis_client

async def start_movie_events_listener(event_handler: Callable[[dict[str, Any]], None]):
    """Запускает слушателя событий о фильмах

    Args:
        event_handler: Функция-обработчик событий
    """
    redis = await get_redis()
    pubsub = redis.pubsub()
    
    async def reader():
        await pubsub.subscribe("movie_events")
        while True:
            try:
                message = await pubsub.get_message(ignore_subscribe_messages=True)
                if message is not None:
                    data = json.loads(message["data"])
                    await event_handler(data)
            except Exception as e:
                print(f"Error processing message: {e}")
            await asyncio.sleep(0.1)
    
    asyncio.create_task(reader())
