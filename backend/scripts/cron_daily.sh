#!/usr/bin/env bash
# Railway Cron — run daily at 05:00 UTC (~07:00 Israel winter)
set -euo pipefail
cd "$(dirname "$0")/.."
export DJANGO_SETTINGS_MODULE=mandeles_portal.settings
python manage.py daily_sync
