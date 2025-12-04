# Build context MUST be ./services/bff_service
FROM python:3.11-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

# Copy current context (bff code) into container
COPY . /app/bff_service/

# Python deps
RUN pip install --no-cache-dir fastapi==0.111.0 uvicorn[standard]==0.30.1 httpx==0.27.0

EXPOSE 8001
CMD ["uvicorn", "bff_service.main:app", "--host", "0.0.0.0", "--port", "8001"]