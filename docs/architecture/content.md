# Content Architecture — Phase 2.5

Central content model that every future module (Landing Page Builder, Blog, AI content) will use.

## Design principles

1. **Page is the root entity** — all public content is a `Page` with type, status, hierarchy, and locale.
2. **SEO integration** — on publish, `SlugService.register_slug()` links the page to the SEO registry.
3. **Versioning on publish** — immutable `PageVersion` snapshots blocks and terms.
4. **Taxonomies unify categories and tags** — `Taxonomy` + `TaxonomyTerm` instead of separate tables.
5. **Blocks are ordered JSON** — `ContentBlock` stores builder data; Phase 3 adds the visual editor.
6. **Internal links are first-class** — `InternalLink` graph between pages.

## Entity model

```
Tenant
  ├── ContentTemplate (block_schema defaults)
  ├── Taxonomy (category | tag | custom)
  │     └── TaxonomyTerm (hierarchical)
  ├── Page (parent → children URL tree)
  │     ├── ContentBlock (ordered)
  │     ├── PageTerm (M2M terms)
  │     ├── PageVersion (publish snapshots)
  │     ├── InternalLink (outbound)
  │     └── InternalLink (inbound)
  └── SEOSlug (via publish — content_id → Page.id)
```

## Page model

| Field | Purpose |
|-------|---------|
| `page_type` | landing_page, blog, **static**, resource, industry |
| `status` | draft → in_review → scheduled → published → unpublished → archived |
| `parent` | URL hierarchy (`/blog/my-post` under `/blog`) |
| `full_path` | Canonical path segment (unique per tenant + locale) |
| `template` | Optional `ContentTemplate` |
| `published_version` | Current live version number |
| `meta_title` / `meta_description` | SEO overrides → `MetadataService` |

## Publishing workflow

```
DRAFT ──→ IN_REVIEW ──→ SCHEDULED ──→ PUBLISHED
  │           │              │              │
  └───────────┴──────────────┴──→ ARCHIVED ←─┘
                              UNPUBLISHED
```

On `PUBLISHED`:
1. Create `PageVersion` snapshot (blocks + terms)
2. Register `SEOSlug` for sitemap
3. Set `published_at`

## URL hierarchy

`UrlHierarchyService` applies type-based root prefixes:

| Page type | Root prefix | Example |
|-----------|-------------|---------|
| `landing_page` | `/pages` | `/pages/promo` |
| `blog` | `/blog` | `/blog/my-post` |
| `static` | *(root)* | `/about` |
| `resource` | `/resources` | `/resources/guide` |

Static marketing hubs (`/solutions/...`, `/industries/...`) remain Next.js routes until migrated to `Page` records.

Children inherit parent path: `/blog/hub/post-slug`.

Uniqueness: `(tenant, full_path, locale)`.

## Taxonomies

| Kind | `is_hierarchical` | `allow_multiple` |
|------|-------------------|------------------|
| category | true | false |
| tag | false | true |
| custom | configurable | configurable |

## Content blocks

Block types (extensible): `hero`, `text`, `rich_text`, `cta`, `faq`, `image`, `gallery`, `features`, `testimonials`, `form`, `contact_form`, `custom`.

Each block: `{ block_type, sort_order, config: JSON, is_visible }`. Media blocks reference `MediaAsset` via `config.media_id`.

## Templates

`ContentTemplate.block_schema` defines default blocks for new pages of a given `page_type`.

`theme_slug` + `theme_config` (JSON) hold design tokens for Phase 3 builder themes.

## Media

`MediaAsset` — centralized registry for `image`, `video`, `document` references used in block `config`.

## Scheduled publishing

Run `python manage.py publish_scheduled_pages` (cron) to publish pages where `status=scheduled` and `scheduled_at <= now`.

## Duplicate

`POST /content/pages/{id}/duplicate/` — copies page, blocks, and terms as a new draft.

## Internal linking

`InternalLink`: source_page → target_page with `link_type`, `anchor_text`, `is_automatic`.

`suggest_links()` returns manual links today; AI suggestions in Phase 3+.

## API (`/api/v1/content/`)

| Endpoint | Permission |
|----------|------------|
| `GET/POST /pages/` | view / create |
| `GET/PATCH/DELETE /pages/{id}/` | view / edit / delete |
| `POST /pages/{id}/publish/` | publish |
| `GET /pages/{id}/versions/` | view |
| `GET/POST /pages/{id}/blocks/` | view / edit |
| `GET/POST /pages/{id}/links/` | view / edit |
| `GET/POST /taxonomies/` | view / create |
| `GET/POST /taxonomies/{id}/terms/` | view / create |
| `GET/POST /templates/` | view / create |

## Permissions

`content.view`, `content.create`, `content.edit`, `content.publish`, `content.delete`

## What comes next (Phase 3)

See **[landing-page-engine.md](./landing-page-engine.md)** for full architecture (awaiting approval).

- **Landing Page Builder UI** — block editor consuming this API (no drag-and-drop)
- **Public render route** — `/[locale]/pages/[...slug]`
- **Block library** — 14 block types + reorder/duplicate/hide
- **Analytics hooks** — page_view, cta_click, form_submit, whatsapp_click

Phase 4 (leads): **[lead-generation-engine.md](./lead-generation-engine.md)**.

## Dashboard

`/dashboard/content` — page list + status (no builder in Phase 2.5).
