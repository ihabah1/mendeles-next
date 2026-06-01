#!/usr/bin/env bash
# Railway entrypoint when the service Root Directory is the repo root.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/backend"

export DJANGO_SETTINGS_MODULE=mandeles_portal.settings

echo "==> migrate"
python manage.py migrate --noinput

echo "==> collectstatic"
python manage.py collectstatic --noinput

echo "==> bootstrap admin (if enabled)"
python manage.py ensure_superuser || true

echo "==> gunicorn on port ${PORT:-8000}"
exec gunicorn mandeles_portal.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
