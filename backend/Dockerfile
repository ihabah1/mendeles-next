FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Postgres driver (psycopg2) + git (AI agent PR/push)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc git tzdata \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps (paths relative to backend/ — Root Directory must be backend)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x scripts/start.sh

EXPOSE 8000

CMD ["bash", "scripts/start.sh"]
