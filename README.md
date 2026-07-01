# Mendeles — Lead Generation Platform

Production-ready **Phase 1 foundation** + **Phase 2 SEO Core**: Auth, RBAC, Users, Audit, Settings, centralized SEO engine.

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind, next-intl (Hebrew RTL)
- **Backend:** Django 5 + DRF, JWT + httpOnly refresh cookie
- **Database:** PostgreSQL

## Documentation

- [Architecture overview](docs/architecture/overview.md)
- [SEO architecture](docs/architecture/seo.md)
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
# Backend (37+ tests)
cd backend && pytest

# Frontend E2E (requires running app)
cd frontend && npx playwright test
```

## Railway

See [RAILWAY-MENDELES.md](RAILWAY-MENDELES.md) and [docs/deployment.md](docs/deployment.md).

## Phase 2 (SEO Core — included)

Centralized SEO settings, metadata engine, slugs, sitemap, robots, schema.org, validation, dashboard.

## Phase 3+ (not included)

Landing pages, blog, leads, AI, keyword research, payments.
