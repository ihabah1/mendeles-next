# Phase 3 — Landing Page Engine (Architecture)

> **Status:** Design only — awaiting approval before implementation.  
> **Out of scope:** AI, Lead Routing, CRM, Payments, Keyword Research.

## Objective

Production-ready engine for SEO-optimized landing pages built from reusable blocks.  
This becomes the foundation for future AI-generated pages without coupling to AI today.

---

## Relationship to Phase 2.5

Phase 2.5 already implemented the **content data layer**. Phase 3 adds the **builder UI**, **public renderer**, **block library**, and **analytics hooks** — not parallel tables.

| Requested name | Implementation | Notes |
|----------------|----------------|-------|
| `LandingPage` | `content.Page` where `page_type=landing_page` | Title, slug, status, template, author, publish date already exist |
| `LandingPageVersion` | `content.PageVersion` | Immutable snapshots on publish |
| `LandingPageTemplate` | `content.ContentTemplate` | `block_schema`, `theme_slug`, `theme_config` |
| `LandingPageBlock` | `content.ContentBlock` | `block_type`, `sort_order`, `config`, `is_visible` |
| `LandingPageSEO` | `Page.meta_*` + `seo.SEOSlug` + `MetadataService` | No duplicate SEO tables |
| `LandingPageAnalytics` | **New** `content.PageAnalyticsEvent` | Hooks only — no dashboard |

**Principle:** extend `content` + `seo` apps; do not fork duplicate models.

---

## High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Dashboard (Next.js)                       │
│  /dashboard/landing-pages   — list + settings                    │
│  /dashboard/landing-pages/[id]/edit — block editor (no DnD)      │
│  /dashboard/landing-pages/[id]/preview — device preview          │
└────────────────────────────┬────────────────────────────────────┘
                             │ JWT + RBAC
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Landing Page API  /api/v1/landing-pages/            │
│  (facade over content.Page scoped to landing_page type)          │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────────┐   ┌──────────────┐
│ PageService │    │ BlockService    │   │ PublishService│
│ VersionSvc  │    │ TemplateService │   │ SlugService   │
└─────────────┘    └─────────────────┘   └──────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           Public API  GET /api/v1/public/pages/{path}            │
│           (published only, locale-aware, cacheable)              │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│     Next.js public route  /[locale]/pages/[...slug]              │
│     LandingPageRenderer → BlockRegistry → block components       │
│     generateMetadata() → existing SEO engine                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database design

### Existing tables (reuse)

#### `content_pages` → LandingPage

| Field | Landing page use |
|-------|------------------|
| `title` | Page title |
| `slug` / `full_path` | URL (`/pages/{slug}`) |
| `status` | draft / in_review / scheduled / published / archived |
| `template_id` | LandingPageTemplate FK |
| `locale` | he / en |
| `meta_title`, `meta_description` | SEO overrides |
| `published_at`, `scheduled_at` | Publish scheduling |
| `author_id` | Author |
| `published_version` | Live version pointer |

**New fields (migration):**

| Field | Type | Purpose |
|-------|------|---------|
| `featured_image_id` | FK → `MediaAsset`, null | OG / hero fallback |
| `review_notes` | text, blank | Optional review workflow notes |

#### `content_page_versions` → LandingPageVersion

No schema change. Snapshot includes `blocks_snapshot` JSON array.

#### `content_templates` → LandingPageTemplate

No schema change. `block_schema` seeds default blocks; `theme_slug` + `theme_config` drive layout tokens.

#### `content_blocks` → LandingPageBlock

No schema change. `is_visible=false` implements **Hide**.

### Extended `BlockType` enum

Phase 2.5 has: `hero`, `text`, `rich_text`, `cta`, `faq`, `image`, `gallery`, `features`, `testimonials`, `form`, `contact_form`, `custom`.

**Phase 3 additions:**

| Block type | Purpose |
|------------|---------|
| `benefits` | Icon + title + description grid |
| `whatsapp` | Floating / inline WhatsApp CTA |
| `map` | Google Maps embed |
| `video` | Hosted or external video |
| `divider` | Horizontal rule / section break |
| `spacer` | Vertical spacing token |

Alias mapping: `text` → deprecated in favor of `rich_text`; `form` / `contact_form` share one renderer with different default `config`.

### New table: `content_page_analytics_events` (hooks only)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | FK | |
| `page_id` | FK → Page | |
| `block_id` | UUID, null | CTA / form block |
| `event_type` | enum | `page_view`, `cta_click`, `form_submit`, `whatsapp_click` |
| `payload` | JSON | UTM, path, block_key, etc. |
| `session_id` | string, null | Anonymous session hash |
| `created_at` | datetime | |

**No aggregation tables.** Phase 4+ may consume events. Insert via public beacon endpoint (rate-limited, no PII beyond UTM).

### Block `config` JSON schema (per type)

Each block type has a Zod/Pydantic schema in `content/domain/block_schemas/`. Example:

```json
// hero
{
  "headline": "string",
  "subheadline": "string",
  "primaryCta": { "label": "string", "href": "string" },
  "secondaryCta": { "label": "string", "href": "string" },
  "mediaId": "uuid|null",
  "alignment": "left|center"
}
```

```json
// contact_form
{
  "formId": "uuid",
  "fields": ["name", "phone", "email", "message"],
  "submitLabel": "string",
  "successMessage": "string"
}
```

`formId` references Phase 4 `forms.FormDefinition` (or inline config until Phase 4 ships).

---

## Block system

### Operations

| Action | API | Implementation |
|--------|-----|----------------|
| Create | `POST .../blocks/` | `BlockService.create()` |
| Update | `PATCH .../blocks/{id}/` | `BlockService.update()` |
| Delete | `DELETE .../blocks/{id}/` | soft-delete block row |
| Hide | `PATCH .../blocks/{id}/` `{ is_visible: false }` | existing field |
| Duplicate | `POST .../blocks/{id}/duplicate/` | copy config, `sort_order + 1`, renumber |
| Reorder | `POST .../blocks/reorder/` | `{ block_id, direction: up\|down }` or `{ ordered_ids: [] }` |

**No drag-and-drop.** Editor exposes Move Up / Move Down buttons calling `reorder`.

### Block registry (frontend)

```
frontend/lib/landing/
  blocks/
    registry.ts          — block_type → component + schema + editor panel
    schemas/             — Zod validators per block
    render/              — public SSR components
    editor/                — dashboard form panels
```

Shared props: `{ config, locale, pageId, blockId, isPreview }`.

---

## REST API design

Base: `/api/v1/landing-pages/` — facade filtering `page_type=landing_page`.

### Pages

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/` | `content.view` | List landing pages (filter status, search) |
| POST | `/` | `content.create` | Create draft from template |
| GET | `/{id}/` | `content.view` | Page + blocks + SEO summary |
| PATCH | `/{id}/` | `content.edit` | Title, slug, status, template, featured image, meta |
| DELETE | `/{id}/` | `content.delete` | Soft delete |
| POST | `/{id}/duplicate/` | `content.create` | Clone page + blocks |
| POST | `/{id}/submit-review/` | `content.edit` | draft → in_review |
| POST | `/{id}/publish/` | `content.publish` | Publish + version + slug |
| POST | `/{id}/archive/` | `content.publish` | → archived |
| POST | `/{id}/restore-version/{n}/` | `content.edit` | Restore blocks from version |

### Blocks (nested)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/{id}/blocks/` | `content.view` |
| POST | `/{id}/blocks/` | `content.edit` |
| PATCH | `/{id}/blocks/{block_id}/` | `content.edit` |
| DELETE | `/{id}/blocks/{block_id}/` | `content.edit` |
| POST | `/{id}/blocks/{block_id}/duplicate/` | `content.edit` |
| POST | `/{id}/blocks/reorder/` | `content.edit` |

### Templates

| Method | Path | Permission |
|--------|------|------------|
| GET | `/templates/` | `content.view` |
| POST | `/templates/` | `content.create` |
| GET | `/templates/{id}/` | `content.view` |

### Preview (authenticated)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/{id}/preview/` | `content.view` |
| Query | `?version=N` | specific version snapshot |
| Query | `?device=desktop\|tablet\|mobile` | metadata for preview frame only |

Returns rendered block tree + SEO bundle (same shape as public API).

### Public (unauthenticated)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/public/pages/` | Optional — list published paths for ISR |
| GET | `/api/v1/public/pages/by-path/` | None — `?path=/pages/foo&locale=he` |
| POST | `/api/v1/public/analytics/` | None — rate-limited event beacon |

---

## Rendering engine

### Server flow (published page)

1. Request `/{locale}/pages/{slug...}`
2. Next.js `generateMetadata()` → `buildPageMetadata()` with page SEO overrides from public API
3. Server Component fetches `GET /public/pages/by-path/`
4. `LandingPageRenderer` maps `blocks[]` → registry components
5. `<PageSchemas />` emits WebPage + FAQ (if faq block) + BreadcrumbList JSON-LD
6. Analytics hook fires `page_view` on client mount

### Preview flow (dashboard)

Same renderer component with `isPreview=true` and draft blocks from preview API (not cached).

### Device preview

CSS container widths in preview shell:

| Device | Width |
|--------|-------|
| Desktop | 1280px |
| Tablet | 768px |
| Mobile | 375px |

No separate HTML — responsive CSS inside single renderer.

### Caching

- Public API: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`
- On publish: purge Next.js path via `revalidatePath` webhook (internal)

---

## Editor UX

Route: `/dashboard/landing-pages/[id]/edit`

### Layout

```
┌──────────────┬────────────────────────────┬──────────────┐
│ Block list   │   Preview (iframe/live)    │ Block editor │
│ [+ Add]      │   [Desktop|Tablet|Mobile]  │ fields for   │
│ ↑ ↓ dup hide │                            │ selected blk │
│ delete       │                            │              │
└──────────────┴────────────────────────────┴──────────────┘
```

### Page settings panel (slide-over or tab)

- Title, slug (with validation), status, template, featured image
- SEO tab → defers to existing `/dashboard/seo` patterns (meta title/desc, validate button)
- Author (read-only or picker if permission)
- Publish date / schedule

### Accessibility (WCAG 2.2 AA)

- Keyboard-operable block list (no drag required)
- All editor inputs labeled
- Preview iframe `title` attribute
- Public blocks reuse marketing a11y patterns (focus-visible, contrast tokens)

---

## Publishing workflow

```
DRAFT ──→ IN_REVIEW ──→ PUBLISHED
  │           │              │
  │           └── SCHEDULED ─┘
  └──────────────────→ ARCHIVED
```

| Action | Transition | Side effects |
|--------|------------|--------------|
| Save draft | — | PATCH blocks |
| Submit review | → in_review | audit log |
| Publish | → published | PageVersion, SEOSlug, sitemap, revalidate |
| Schedule | → scheduled | cron `publish_scheduled_pages` |
| Archive | → archived | remove from sitemap |
| Restore version | draft blocks ← snapshot | no auto-publish |

---

## SEO integration

On publish (existing `PublishService` + extensions):

1. `MetadataService.merge(page.meta_*, global settings)`
2. `SlugService.register_slug(content_type=landing_page)`
3. `SchemaService.webpage()` — **implement stub**
4. `SchemaService.faq()` — when FAQ block present
5. `BreadcrumbService` — Home → Pages → {title}
6. Sitemap entry via `SEOSlug`
7. `buildPageMetadata()` on Next.js route

Featured image → `openGraph.image` fallback.

---

## Forms (Phase 3 scope)

- `contact_form` block renders accessible form (name, phone, email, message)
- `POST /api/v1/public/forms/{form_id}/submit/` stores submission
- **Phase 3:** store in `forms.FormSubmission` table (minimal)
- **Phase 4:** promotes submission → `Lead` (see lead-generation-engine.md)

No lead routing, notifications, or CRM in Phase 3.

---

## Analytics hooks

Client utility `trackLandingEvent(type, payload)`:

| Event | Trigger |
|-------|---------|
| `page_view` | page mount |
| `cta_click` | CTA block click |
| `form_submit` | successful form POST |
| `whatsapp_click` | WhatsApp block click |

POST to `/api/v1/public/analytics/` → `PageAnalyticsEvent` row.

---

## Permissions

Reuse existing:

- `content.view`, `content.create`, `content.edit`, `content.publish`, `content.delete`

Optional Phase 3 addition:

- `landing_pages.preview` — alias of `content.view` (no new permission needed)

---

## Frontend file plan (implementation phase)

```
frontend/
  app/[locale]/pages/[...slug]/page.tsx     — public render
  app/[locale]/dashboard/landing-pages/
    page.tsx                                 — list
    [id]/edit/page.tsx                       — editor
    [id]/preview/page.tsx                    — full preview
  components/landing/
    landing-page-renderer.tsx
    editor/...
  lib/landing/blocks/...
```

---

## Testing strategy

| Layer | Tests |
|-------|-------|
| Backend | block reorder/duplicate, publish+version, public API 404 for draft |
| Frontend | block schema validation, renderer snapshot per block |
| E2E | create page → add hero → publish → public URL 200 |
| a11y | axe on rendered landing page |

---

## Implementation phases (after approval)

1. **Backend facade** — landing-pages API, block ops, public read API, analytics table
2. **Block schemas** — Pydantic + Zod for all 14 block types
3. **Public renderer** — Next.js route + block components
4. **Editor shell** — list, settings, block list with up/down/dup/hide/delete
5. **Preview** — device frames
6. **SEO stubs** — WebPage + FAQ schema
7. **Form submission storage** — minimal table, wired to contact_form block

---

## Open questions for approval

1. **URL prefix** — keep `/pages/{slug}` (Phase 2.5 convention) or allow custom root per tenant?
2. **Form submissions in Phase 3** — minimal `FormSubmission` table here, or wait for Phase 4 `Lead` only?
3. **Template marketplace** — system templates only at launch, or tenant-created from day one?
4. **Review workflow** — is `in_review` required before publish, or optional?

---

**STOP — awaiting approval before any implementation.**
