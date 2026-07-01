# SEO Core — Phase 2 Architecture

Centralized SEO infrastructure shared by every Mendeles page module.

## Principles

1. **Single source of truth** — all metadata, slugs, schemas, and validation flow through the SEO Core.
2. **Server-side generation** — metadata is built on the server (Next.js `generateMetadata`, Django services).
3. **Extensible registry** — sitemap and slug engines accept future content types without duplication.
4. **Tenant-scoped** — settings, slugs, and redirects are per-tenant.

## Components

| Layer | Backend | Frontend |
|-------|---------|----------|
| Settings | `seo.application.settings_service` | `lib/seo/settings.ts` |
| Metadata | `seo.application.metadata_service` | `lib/seo/metadata.ts` |
| Canonical | `seo.application.canonical_service` | `lib/seo/canonical.ts` |
| Slugs | `seo.application.slug_service` | `lib/seo/slug.ts` |
| Sitemap | `seo.application.sitemap_service` | `app/sitemap.ts` |
| Robots | `seo.application.robots_service` | `app/robots.ts` |
| Schema.org | `seo.application.schema_service` | `lib/seo/schema.ts` |
| Breadcrumbs | `seo.application.breadcrumb_service` | `lib/seo/breadcrumbs.ts` |
| Validation | `seo.application.validation_service` | `lib/seo/validation.ts` |
| Redirects | `seo.application.redirect_service` | API only (no UI) |
| Internal linking | `content.application.internal_link_service` | stub delegates to content |

## Metadata Flow

```
Page (Next.js generateMetadata)
    → buildPageMetadata()
        → fetchPublicSEO()  [GET /api/v1/seo/public/]
        → mergePageMetadata(settings, page overrides)
        → Next.js Metadata (title, OG, Twitter, canonical)

Dashboard validation
    → POST /api/v1/seo/validate/
        → SEOValidationService
        → structured report (score, issues[])
```

Every marketing page calls `buildPageMetadata()` once. No page should set raw `title`/`description` without going through the engine.

## Slug Engine

- Hebrew transliteration via `seo.domain.transliteration`
- Uniqueness enforced in `seo_slugs` table (`tenant + slug + locale`)
- `SlugService.register_slug()` for future content modules
- Duplicate detection via `SlugService.find_duplicate()`

## Schema Engine

**Implemented:** Organization, WebSite, BreadcrumbList

**Architecture-ready (stubs):** WebPage, FAQ, Article, LocalBusiness

Rendered via `<PageSchemas />` → JSON-LD in page HTML.

## Sitemap & Robots

- `GET /api/v1/seo/sitemap/` — JSON entries (public)
- `app/sitemap.ts` — Next.js sitemap.xml (fetches API, falls back to static registry)
- `GET /api/v1/seo/robots/` — robots content (public)
- `app/robots.ts` — Next.js robots.txt

Environment-aware: development/staging → `Disallow: /`

## Dashboard

`/dashboard/seo` — Global SEO Settings, SEO Status, SEO Validation

Permissions: `seo.view`, `seo.manage`

## Future Expansion (Phase 3+)

| Module | Integration point |
|--------|-------------------|
| Landing Pages | `content.Page` + `SEOSlug.ContentType.LANDING_PAGE` |
| Blog | `ContentType.BLOG`, `SchemaService.article()` |
| Industries/Templates | slug registry + sitemap hooks |
| Keyword Intelligence | consumes `SEOValidationService` reports |
| Redirect UI | `RedirectService` + dashboard screen |
| Internal linking | `InternalLinkingService.suggest_links()` |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `SEO_PUBLIC_TENANT_SLUG` | Tenant for public SSR SEO bundle |
| `FRONTEND_URL` / `NEXT_PUBLIC_SITE_URL` | Canonical base fallback |
| `APP_ENV` | robots.txt environment (`production`, `staging`, `development`) |
