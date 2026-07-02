# Mendeles — Lead Generation Platform

Production-ready **Phase 1 foundation** + **Phase 2 SEO Core** + **Phase 2.5 Content Architecture** + **Phase 4 Lead Generation Engine** + **Phase X Automation Center** (infrastructure).

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind, next-intl (Hebrew RTL)
- **Backend:** Django 5 + DRF, JWT + httpOnly refresh cookie
- **Database:** PostgreSQL

## Documentation

- [Master development roadmap](docs/master-development-roadmap.md)
- [Master AI Growth Vision](docs/master-ai-growth-vision.md)
- [Master enterprise checklist](docs/master-enterprise-checklist.md)
- [Architecture overview](docs/architecture/overview.md)
- [SEO architecture](docs/architecture/seo.md)
- [Content architecture](docs/architecture/content.md)
- [Lead generation (Phase 4)](docs/architecture/lead-generation-engine.md)
- [Automation Center (Phase X)](docs/architecture/automation-center.md)
- [AI SEO Automation Center (design)](docs/architecture/ai-seo-automation-dashboard.md)
- [Autonomous Growth Engine (Phase 14 — vision)](docs/architecture/autonomous-growth-engine.md)
- [Phase 4 completion report](docs/phase4-completion-report.md)
- [Phase X completion report](docs/phase-x-completion-report.md)
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

## Phase X (Automation Center — infrastructure included)

Job orchestration: queue, workers, scheduler schema, workflows, approval checkpoints, notifications. Dashboard shows **real data only**.

```bash
cd backend && python manage.py seed_automation      # default queue per tenant
cd backend && python manage.py process_automation_queue   # process queued jobs
```

AI content generation and external provider handlers are **not** implemented — await explicit approval.

## Phase 3 (not included — next approved phase)

Landing Page Engine: block renderer, editor, public SSR pages, analytics hooks. See [master roadmap](docs/master-development-roadmap.md).

## Phase 5+ (not included)

Revenue engine, AI SEO, marketing automation, and later phases — roadmap reference only.
