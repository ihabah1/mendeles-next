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

# Email verification (Resend) — REQUIRED for registration emails
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=Mandeles <noreply@mendeles.co.il>
# EMAIL_BACKEND is auto-set to Resend when RESEND_API_KEY exists.
# Remove EMAIL_BACKEND=console if you added it earlier.

# WhatsApp bot (Twilio) — optional
# WHATSAPP_AGENT_ENABLED=true
# TWILIO_ACCOUNT_SID=AC...
# TWILIO_AUTH_TOKEN=...
# TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
# GEMINI_API_KEY=...
```

## Frontend (`mendeles-next`) — Variables (contact widget)

```env
NEXT_PUBLIC_CONTACT_PHONE=+972-3-0000000
NEXT_PUBLIC_CONTACT_EMAIL=hello@mendeles.co.il
NEXT_PUBLIC_WHATSAPP_NUMBER=97230000000
NEXT_PUBLIC_WHATSAPP_PREFILL=שלום Mendeles
```

אחרי שמירה → **Redeploy** על שני השירותים + **migrate** ב-Backend:

```bash
python manage.py migrate
```

## אימות מייל — בדיקה אחרי deploy

1. `GET https://mendeles.com/api/v1/auth/email-status/` → `"configured": true`
2. הרשמה ב-`/register` → מייל עם קישור `/verify-email?token=...`
3. לחיצה על הקישור → הודעת הצלחה + מעבר ל-`/login`
4. אם המייל לא הגיע: כפתור **שלח שוב אימות** בדף ההרשמה, או `POST /api/v1/auth/resend-verification/` עם `{ "email": "..." }`

## WhatsApp bot — הגדרה

1. [Twilio WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Webhook: `POST https://<backend-public-domain>/api/v1/whatsapp/webhook/`
3. בדיקה: `GET https://<backend>/api/v1/whatsapp/status/` → `"configured": true`

## Healthcheck

Frontend healthcheck: `GET /api/health` (configured in `railway.toml`).  
Do **not** use `/` — it triggers full SSR and backend fetches during deploy probes.

## בדיקה

- API: `https://<backend>/api/v1/health/` → `healthy`
- Web: `https://mendeles.com`
