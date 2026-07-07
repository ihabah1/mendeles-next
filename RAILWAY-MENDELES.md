# Mendeles — Railway Deploy (motivated-gratitude)

## שירותים

| שירות | Root Directory | Dockerfile |
|--------|----------------|------------|
| **mendeles-next** (Frontend) | *(ריק — שורש repo)* | `Dockerfile.frontend` |

> **חשוב:** Root Directory חייב להיות **ריק** (לא `frontend`). אם מוגדר `frontend`, שנה ל-Dockerfile `Dockerfile` בתוך התיקייה.
| **eloquent-perfection** (API) | `backend` | `Dockerfile` |
| **Postgres** | — | DB חדש |

## Frontend (`mendeles-next`) — Variables

```env
# Preferred — private network (set in railway.toml):
API_URL=http://${{eloquent-perfection.RAILWAY_PRIVATE_DOMAIN}}:${{eloquent-perfection.PORT}}
BACKEND_PUBLIC_HOST=${{eloquent-perfection.RAILWAY_PUBLIC_DOMAIN}}

# Fallback — public HTTPS:
# API_URL=https://${{eloquent-perfection.RAILWAY_PUBLIC_DOMAIN}}

# Google Analytics 4 — set GA_MEASUREMENT_ID (runtime, recommended) or NEXT_PUBLIC_GA_MEASUREMENT_ID (build-time)
# GA_MEASUREMENT_ID=G-MQRMQHNNRR
# NEXT_PUBLIC_GA_MEASUREMENT_ID=G-MQRMQHNNRR

# SEO — canonical base (build + runtime). Must be https://mendeles.com in production.
NEXT_PUBLIC_SITE_URL=https://mendeles.com
SITE_URL=https://mendeles.com
```

> **חובה ב-runtime** — ב-Variables של `mendeles-next` ודא ש-`API_URL` או `BACKEND_PUBLIC_HOST` מוגדרים (לא `localhost`).
>
> **GA4:** הגדר `GA_MEASUREMENT_ID` ב-Variables של `mendeles-next` — עובד ב-runtime ללא rebuild. אופציונלי: `NEXT_PUBLIC_GA_MEASUREMENT_ID` לפני build.

## Backend (`eloquent-perfection`) — Variables

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_SECRET_KEY=<מחרוזת-אקראית-50+>
JWT_SECRET_KEY=<מחרוזת-אקראית-32+>
CORS_ALLOWED_ORIGINS=https://mendeles.com,https://www.mendeles.com
FRONTEND_URL=https://mendeles.com
SITE_URL=https://mendeles.com
# ALLOWED_HOSTS is optional — code always adds .railway.app for healthchecks
# Do not set SECURE_SSL_REDIRECT=true — Railway terminates TLS; Django redirect breaks healthchecks
BOOTSTRAP_ADMIN_EMAIL=admin@yourdomain.com
BOOTSTRAP_ADMIN_PASSWORD=<strong-password-min-10-chars>
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

אחרי שמירה → **Redeploy** על שני השירותים.

## Healthcheck

Frontend healthcheck: `GET /api/health` (configured in `railway.toml`).  
Do **not** use `/` — it triggers full SSR and backend fetches during deploy probes.

## בדיקה

- API: `https://<backend>/api/v1/health/` → `healthy`
- Web: `https://mendeles.com`
