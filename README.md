# Mendeles — Lead Generation Platform

Production-ready foundation (Phase 1): Auth, RBAC, Users, Audit, Settings, Dashboard shell.

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind, next-intl (Hebrew RTL)
- **Backend:** Django 5 + DRF, JWT + httpOnly refresh cookie
- **Database:** PostgreSQL

## Local development

```bash
# Start PostgreSQL + API + Web
docker compose -f docker/docker-compose.yml up --build

# Or manually:
cd backend && pip install -r requirements/dev.txt
python manage.py migrate && python manage.py seed_rbac
python manage.py runserver 8000

cd frontend && npm install && npm run dev
```

API: `http://localhost:8000/api/v1/`  
Web: `http://localhost:3000`  
OpenAPI: `http://localhost:8000/api/v1/docs/`

## Railway (project: motivated-gratitude)

1. Create **new PostgreSQL** service
2. **API service** — Root Directory: `backend`
   - `DATABASE_URL` from Postgres plugin
   - `DJANGO_SECRET_KEY`, `JWT_SECRET_KEY` (32+ chars)
   - `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`
   - Start: `python manage.py migrate && python manage.py seed_rbac && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
3. **Web service** — Root Directory: `frontend`
   - `API_URL` = internal API URL

## Tests

```bash
cd backend && pytest
```

## Phase 2 (not included)

Landing pages, leads, blog, analytics, AI, WhatsApp, payments.
