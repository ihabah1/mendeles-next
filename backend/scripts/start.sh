#!/usr/bin/env bash
# Railway entrypoint when Root Directory = backend/
set -euo pipefail

cd "$(dirname "$0")/.."
export DJANGO_SETTINGS_MODULE=mandeles_portal.settings

python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py ensure_superuser || true

exec gunicorn mandeles_portal.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
