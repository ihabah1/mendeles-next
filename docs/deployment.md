# Deployment Guide

## Local (Docker)

```bash
docker compose -f docker/docker-compose.yml up --build
```

- Web: http://localhost:3000
- API: http://localhost:8000/api/v1/
- Postgres: localhost:5432

## Local (manual)

```bash
# Backend
cd backend
pip install -r requirements/dev.txt
python manage.py migrate
python manage.py seed_rbac
python manage.py runserver 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Railway (project: motivated-gratitude)

| Service | Root | Dockerfile |
|---------|------|------------|
| mendeles-next | repo root | Dockerfile.frontend |
| eloquent-perfection | backend | Dockerfile |
| PostgreSQL | — | managed plugin |

### Backend env

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_SECRET_KEY=<50+ chars>
JWT_SECRET_KEY=<32+ chars>
CORS_ALLOWED_ORIGINS=https://<frontend-domain>
FRONTEND_URL=https://<frontend-domain>
BOOTSTRAP_ADMIN_EMAIL=admin@yourdomain.com
BOOTSTRAP_ADMIN_PASSWORD=<strong-password-10+>
```

> In production, `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are **required**. No default credentials are used.

### Frontend env

```env
API_URL=http://${{eloquent-perfection.RAILWAY_PRIVATE_DOMAIN}}:${{eloquent-perfection.PORT}}
BACKEND_PUBLIC_HOST=${{eloquent-perfection.RAILWAY_PUBLIC_DOMAIN}}
```

### Health checks

- API: `/api/v1/health/`
- Web: `/`

See also [RAILWAY-MENDELES.md](../../RAILWAY-MENDELES.md).
