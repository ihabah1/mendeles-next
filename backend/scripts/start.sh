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
import os
from django.conf import settings
from api.services.resend_email import resend_config_status
from api.services.email_verification import can_delegate_email_to_frontend, frontend_email_proxy_enabled
s = resend_config_status()
ek = bool(os.getenv('RESEND_API_KEY', '').strip())
ef = bool(os.getenv('RESEND_FROM_EMAIL', '').strip())
print('[startup] Resend backend:', 'OK' if s['configured'] else 'MISSING', s)
print('[startup] RESEND env raw:', 'key=' + ('set' if ek else 'MISSING'), 'from=' + ('set' if ef else 'MISSING'))
print('[startup] FRONTEND_URL:', settings.FRONTEND_URL or 'MISSING')
print('[startup] Email via frontend delegate:', 'enabled' if can_delegate_email_to_frontend() else 'disabled')
print('[startup] Email via frontend proxy secret:', 'enabled' if frontend_email_proxy_enabled() else 'disabled')
if not s['configured'] and not can_delegate_email_to_frontend():
    print('[startup] WARNING: No email send path — add RESEND_* to THIS backend service or Frontend+EMAIL_PROXY_DERIVE_FROM')
from api.services.sms import sms_config_status
sms = sms_config_status()
print('[startup] SMS verification:', sms.get('provider'), 'OK' if sms.get('configured') else sms.get('hint', 'disabled'))
from api.services.firebase_service import firebase_config_status
fb = firebase_config_status()
print('[startup] Firebase Phone Auth:', 'OK' if fb.get('configured') else fb.get('hint', 'disabled'))
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
