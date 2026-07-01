# Mendeles — Lead Generation Platform

Production-ready **Phase 1 foundation** + **Phase 2 SEO Core** + **Phase 2.5 Content Architecture**.

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind, next-intl (Hebrew RTL)
- **Backend:** Django 5 + DRF, JWT + httpOnly refresh cookie
- **Database:** PostgreSQL

## Documentation

- [Architecture overview](docs/architecture/overview.md)
- [SEO architecture](docs/architecture/seo.md)
- [Content architecture](docs/architecture/content.md)
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

## Phase 2.5 (Content Architecture — included)

Page model, URL hierarchy, taxonomies, blocks, templates, versioning, publishing workflow, internal links.

## Phase 3+ (not included)

Landing Page Builder UI, blog module, AI content generation, keyword research, payments.
