#!/usr/bin/env bash
# Railway entrypoint when Root Directory = backend/
set -euo pipefail

cd "$(dirname "$0")/.."
export DJANGO_SETTINGS_MODULE=mandeles_portal.settings

python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mandeles_portal.settings')
import django
django.setup()
from api.services.resend_email import resend_config_status
from api.services.email_verification import frontend_email_proxy_enabled
s = resend_config_status()
print('[startup] Resend backend:', 'OK' if s['configured'] else 'MISSING', s)
print('[startup] Email via frontend proxy:', 'enabled' if frontend_email_proxy_enabled() else 'disabled')
" || true

python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py ensure_superuser || true

exec gunicorn mandeles_portal.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
