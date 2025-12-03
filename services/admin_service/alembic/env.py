import asyncio
import os
import sys
from logging.config import fileConfig

# Ensure app import path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from app.db.session import Base, _build_db_url
# Import models so Alembic sees metadata
from app.models.movie_models import Movie, Genre  # noqa

# Alembic Config
config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

def get_url():
    # Prefer DATABASE_URL constructed by app helper; fallback to alembic.ini
    try:
        url = _build_db_url()
        if url:
            return url
    except Exception:
        pass
    return config.get_main_option("sqlalchemy.url")

def get_engine():
    url = get_url()
    return create_async_engine(url, future=True, pool_pre_ping=True)

def include_object(object, name, type_, reflected, compare_to):
    return True

def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=Base.metadata,
        include_object=include_object,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online():
    engine = get_engine()
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
        await connection.commit()

if context.is_offline_mode():
    raise NotImplementedError("Offline mode not supported in async setup.")
else:
    asyncio.run(run_migrations_online())
