# Database Schema (Phase 1)

## tenants

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | varchar | Organization name |
| slug | slug | Unique |
| status | enum | active / suspended / trial |
| settings | JSON | Tenant-level settings |
| created_at, updated_at, deleted_at | timestamp | Soft delete via `deleted_at` |

## users (identity)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| email | varchar | Unique login |
| password | hash | Argon2 |
| first_name, last_name | varchar | |
| default_tenant_id | FK → tenants | |
| is_active, is_staff, is_superuser | bool | |
| email_verified_at | timestamp | Required before login |
| preferred_locale | varchar | he / en |
| created_at, updated_at, deleted_at | timestamp | |

## roles / permissions (rbac)

- **permissions** — codename (`users.view`), module, action
- **roles** — slug, name, optional tenant FK, `is_system`
- **role_permissions** — M2M role ↔ permission
- **user_roles** — user ↔ role ↔ tenant

## audit_logs

| Column | Type |
|--------|------|
| tenant_id, user_id | FK (nullable) |
| action | varchar |
| resource_type, resource_id | varchar / UUID |
| metadata | JSON |
| ip_address, user_agent | varchar |
| created_at | timestamp |

## system_settings (siteconfig)

Key/value settings scoped by tenant (e.g. `company.name`).

## seo_global_settings (Phase 2)

Per-tenant centralized SEO configuration: site name, default title/description/keywords, robots policy, canonical base URL, OG/Twitter images, organization metadata.

## seo_slugs

Central slug registry — unique per `(tenant, slug, locale)`. Supports content types: static, landing_page, blog, industry, template, resource.

## seo_redirects

Redirect registry (`from_path` → `to_path`, 301/302). Infrastructure for future redirect management UI.

## content_pages (Phase 2.5)

Central page model: hierarchy (`parent`), `full_path`, `page_type`, `status`, locale, SEO meta overrides, `published_version`.

## content_page_versions

Immutable publish snapshots (blocks + terms JSON).

## content_blocks

Ordered blocks (`block_type`, `config` JSON) per page.

## content_templates

Reusable block schemas per page type.

## content_taxonomies / content_taxonomy_terms

Unified categories, tags, and custom vocabularies (hierarchical terms).

## content_page_terms

M2M page ↔ taxonomy term.

## content_internal_links

Directed links between pages for internal linking graph.

## content_media_assets (Phase 2.5)

Media registry: `image`, `video`, `document` — referenced from block `config.media_id`.

## Auth tokens

- **email_verification_tokens** — hashed token, expiry
- **password_reset_tokens** — hashed token, expiry
- **refresh_tokens** — hashed token, rotation, revocation

Migrations: `python manage.py migrate`  
Seed RBAC: `python manage.py seed_rbac`
