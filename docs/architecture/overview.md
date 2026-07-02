# Mendeles — Architecture Overview

> **Master roadmap:** [master-development-roadmap.md](../master-development-roadmap.md) — guides decisions only; does not authorize future phases.  
> **Product vision:** [master-ai-growth-vision.md](../master-ai-growth-vision.md) — final product specification v1.0 (vision only).  
> **Enterprise checklist:** [master-enterprise-checklist.md](../master-enterprise-checklist.md) — full production vision tracker.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind, next-intl |
| API | Django 5 + Django REST Framework |
| Database | PostgreSQL |
| Auth | JWT access token + httpOnly refresh cookie |
| Deploy | Docker, Railway |

## Application structure

```
backend/
  config/          # Django settings, URLs, WSGI
  core/            # Middleware, pagination, exceptions, rate limiting
  tenancy/         # Multi-tenant organizations (Tenant)
  identity/        # Users, auth, email verification
  rbac/            # Roles, permissions, assignments
  audit/           # Audit log service + API
  siteconfig/      # System settings + admin overview
  seo/             # Phase 2 SEO engine
  content/         # Phase 2.5 content architecture
  leads/           # Phase 4 lead generation

frontend/
  app/[locale]/    # App Router pages (auth, dashboard, marketing)
  components/      # UI, layout, marketing shells
  lib/api/         # API client + auth context
```

## Request flow

1. Browser calls Next.js (`/api/v1/*` proxied to Django in production).
2. `JWTAuthentication` validates Bearer token.
3. `TenantContextMiddleware` sets tenant from user's `default_tenant`.
4. `HasPermission` checks RBAC before protected endpoints.
5. Domain services write audit events on mutations.

## Phase status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 — Foundation | Auth, RBAC, users, audit, dashboard, settings | ✅ Complete |
| 2 — SEO Core | Metadata, slugs, schema, sitemap, robots, validation | ✅ Complete |
| 2.5 — Content | Pages, blocks, templates, publishing, media | ✅ Complete |
| 3 — Landing Page Engine | Block renderer, editor, public SSR pages | ⏳ Approved — not implemented |
| 4 — Lead Generation | Lead capture, dashboard, UTM, export | ✅ Complete |
| 5–14 | Revenue, AI, automation, BI, growth | 📋 Roadmap reference only |

See [master-development-roadmap.md](../master-development-roadmap.md) for full long-term plan.

## Phase architecture docs

| Phase | Document |
|-------|----------|
| 2 — SEO | [seo.md](./seo.md) |
| 2.5 — Content | [content.md](./content.md) |
| 3 — Landing pages | [landing-page-engine.md](./landing-page-engine.md) |
| 4 — Leads | [lead-generation-engine.md](./lead-generation-engine.md) |
| X — Automation Center | [automation-center.md](./automation-center.md) | ✅ Infrastructure |
| 14 — Autonomous Growth | [autonomous-growth-engine.md](./autonomous-growth-engine.md) | Vision only |
| AI SEO Automation Center | [ai-seo-automation-dashboard.md](./ai-seo-automation-dashboard.md) | Design only |

**Checklists:** [master-enterprise-checklist.md](../master-enterprise-checklist.md) · [phase3-phase4-checklist.md](../phase3-phase4-checklist.md) · [phase4-completion-report.md](../phase4-completion-report.md) · [accessibility-checklist.md](../accessibility-checklist.md)

## API

Base: `/api/v1/` — see [api-v1.md](./api-v1.md) and OpenAPI at `/api/v1/docs/`.
