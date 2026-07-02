# Mendeles — Lead Generation Platform

Production-ready **Phase 1 foundation** + **Phase 2 SEO Core** + **Phase 2.5 Content Architecture** + **Phase 4 Lead Generation Engine**.

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind, next-intl (Hebrew RTL)
- **Backend:** Django 5 + DRF, JWT + httpOnly refresh cookie
- **Database:** PostgreSQL

## Documentation

- [Architecture overview](docs/architecture/overview.md)
- [SEO architecture](docs/architecture/seo.md)
- [Content architecture](docs/architecture/content.md)
- [Lead generation (Phase 4)](docs/architecture/lead-generation-engine.md)
- [Phase 4 completion report](docs/phase4-completion-report.md)
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
# Backend (47+ tests)
cd backend && pytest

# Frontend E2E (requires running app)
cd frontend && npx playwright test
```

## Railway

See [RAILWAY-MENDELES.md](RAILWAY-MENDELES.md) and [docs/deployment.md](docs/deployment.md).

## Phase 2.5 (Content Architecture — included)

Page model, URL hierarchy, taxonomies, blocks, templates, versioning, publishing workflow, internal links.

## Phase 4 (Lead Generation — included)

Centralized lead capture, dashboard list/detail, status workflow, notes, activity, UTM tracking, CSV export, RBAC, audit logging.

```bash
cd backend && python manage.py seed_leads   # default sources + contact form per tenant
```

## Phase 3+ (not included)

Landing Page Builder UI, blog module, AI content generation, keyword research, payments.
