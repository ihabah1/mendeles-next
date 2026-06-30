# Mendeles — Lead Generation Platform

Production-ready **Phase 1 foundation**: Auth, RBAC, Users, Audit, Settings, Dashboard shell.

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind, next-intl (Hebrew RTL)
- **Backend:** Django 5 + DRF, JWT + httpOnly refresh cookie
- **Database:** PostgreSQL

## Documentation

- [Architecture overview](docs/architecture/overview.md)
- [Database schema](docs/architecture/database.md)
- [API v1](docs/architecture/api-v1.md)
- [Deployment](docs/deployment.md)

## Local development

```bash
docker compose -f docker/docker-compose.yml up --build
```

API: `http://localhost:8000/api/v1/`  
Web: `http://localhost:3000`  
OpenAPI: `http://localhost:8000/api/v1/docs/`

## Tests

```bash
# Backend (21 tests)
cd backend && pytest

# Frontend E2E (requires running app)
cd frontend && npx playwright test
```

## Railway

See [RAILWAY-MENDELES.md](RAILWAY-MENDELES.md) and [docs/deployment.md](docs/deployment.md).

## Phase 2 (not included)

Landing pages, leads, SEO product, AI, payments.
