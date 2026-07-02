# Mendeles — Architecture Overview

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

## Phase 1 scope

- Authentication & email verification
- RBAC with seeded roles
- User management (invite, edit, deactivate, roles)
- Audit logs
- Tenant settings
- Admin dashboard shell

Phase 2 (not included): landing pages, leads, SEO product, AI, payments.

## Phase 3+ architecture (design)

| Phase | Doc | Status |
|-------|-----|--------|
| 3 — Landing Page Engine | [landing-page-engine.md](./architecture/landing-page-engine.md) | Awaiting approval |
| 4 — Lead Generation Engine | [lead-generation-engine.md](./architecture/lead-generation-engine.md) | Awaiting approval |

**Implementation checklist:** [phase3-phase4-checklist.md](../phase3-phase4-checklist.md)
