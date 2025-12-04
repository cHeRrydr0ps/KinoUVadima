#!/bin/sh

set -e

echo "Waiting for database to be ready..."
python - <<'PY'
import asyncio, asyncpg, os, sys, re
url = os.environ.get("DATABASE_URL")
if not url:
    print("DATABASE_URL is not set, skipping DB wait")
    sys.exit(0)

# asyncpg expects schemes postgresql/postgres. Convert SQLAlchemy async URLs.
if url.startswith("postgresql+asyncpg://"):
    url = "postgresql://" + url.split("postgresql+asyncpg://", 1)[1]
elif url.startswith("postgresql+psycopg://"):
    url = "postgresql://" + url.split("postgresql+psycopg://", 1)[1]

async def main():
    for i in range(30):
        try:
            conn = await asyncpg.connect(url)
            await conn.close()
            print("Database is ready")
            return
        except Exception as e:
            print(f"DB not ready yet ({e}), retrying...")
            await asyncio.sleep(2)
    print("Database is not ready, giving up")
    sys.exit(1)

asyncio.run(main())
PY

echo "Running migrations..."
alembic upgrade heads

echo "Starting admin_service..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
