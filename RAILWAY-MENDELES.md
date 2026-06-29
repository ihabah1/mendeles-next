# Mendeles — Railway Deploy (motivated-gratitude)

## שירותים

| שירות | Root Directory | Dockerfile |
|--------|----------------|------------|
| **mendeles-next** (Frontend) | *(ריק — שורש repo)* | `Dockerfile.frontend` |
| **eloquent-perfection** (API) | `backend` | `Dockerfile` |
| **Postgres** | — | DB חדש |

## Frontend (`mendeles-next`) — Variables

```env
API_URL=https://${{eloquent-perfection.RAILWAY_PUBLIC_DOMAIN}}
```

> חובה ל-build ול-runtime — מפנה `/api/v1/*` ל-Django.

## Backend (`eloquent-perfection`) — Variables

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_SECRET_KEY=<מחרוזת-אקראית-50+>
JWT_SECRET_KEY=<מחרוזת-אקראית-32+>
CORS_ALLOWED_ORIGINS=https://mendeles-next-production.up.railway.app
FRONTEND_URL=https://mendeles-next-production.up.railway.app
# ALLOWED_HOSTS is optional — code always adds .railway.app for healthchecks
# Do not set SECURE_SSL_REDIRECT=true — Railway terminates TLS; Django redirect breaks healthchecks
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

אחרי שמירה → **Redeploy** על שני השירותים.

## בדיקה

- API: `https://<backend>/api/v1/health/` → `healthy`
- Web: `https://mendeles-next-production.up.railway.app`
