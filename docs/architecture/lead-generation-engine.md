# Phase 4 — Lead Generation Engine (Architecture)

> **Status:** Implemented (Phase 4).  
> **Out of scope:** AI, CRM integrations, Payments, Affiliate networks, Lead Routing automation.

## Objective

Centralized lead capture from any landing page form. Architecture must support future routing, CRM sync, AI qualification, and affiliate attribution — without building those now.

---

## Relationship to Phase 3

| Phase 3 delivers | Phase 4 extends |
|------------------|-----------------|
| `contact_form` block renderer | Submissions → `Lead` records |
| `POST /public/forms/.../submit` | Validates + dedupes + creates Lead |
| `PageAnalyticsEvent.form_submit` | `LeadActivity` + analytics hook |
| `formId` in block config | `FormDefinition` reusable across pages |

Phase 4 can start once Phase 3 public form endpoint exists (or ship together with shared `forms` app).

---

## High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Landing Page (public)                          │
│   contact_form block → POST /api/v1/public/leads/                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Lead API  /api/v1/leads/                      │
│   Create (public) │ CRUD (dashboard) │ Search │ Export CSV        │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────────┐   ┌──────────────┐
│ LeadService │    │ FormService     │   │ ActivitySvc  │
│ SearchSvc   │    │ ValidationSvc   │   │ AnalyticsHook│
└─────────────┘    └─────────────────┘   └──────────────┘
                             │
                             ▼
                    PostgreSQL (leads schema)
```

---

## Database design

New Django app: `backend/leads/`

### `leads_leads` → Lead

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | FK | Multi-tenant |
| `name` | string | nullable if phone-only form |
| `phone` | string | nullable |
| `email` | string | nullable |
| `message` | text | nullable |
| `status` | enum | see LeadStatus |
| `source_id` | FK → LeadSource | |
| `landing_page_id` | FK → content.Page, null | |
| `page_url` | string | full URL at submission |
| `form_id` | FK → FormDefinition, null | |
| `ip_address` | inet, null | hashed option for GDPR later |
| `user_agent` | string, null | |
| `referrer` | string, null | |
| `assigned_to_id` | FK → User, null | **future ready** — LeadAssignment |
| `created_at` | datetime | |
| `updated_at` | datetime | |
| `deleted_at` | datetime, null | soft delete |

Indexes: `(tenant, status, created_at)`, `(tenant, email)`, `(tenant, phone)`, `(landing_page_id)`.

### `leads_lead_sources` → LeadSource

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | FK | |
| `name` | string | e.g. "Landing Page", "Manual", "Import" |
| `slug` | string | unique per tenant |
| `is_system` | bool | seeded defaults |

**Seed sources:** `landing_page_form`, `manual`, `api`, `import`.

### LeadStatus (enum — not a separate table)

| Value | Label | Description |
|-------|-------|-------------|
| `new` | New | Just captured |
| `contacted` | Contacted | Team reached out |
| `qualified` | Qualified | Fits criteria |
| `unqualified` | Unqualified | Does not fit |
| `converted` | Converted | Became customer |
| `closed` | Closed | No further action |
| `archived` | Archived | Hidden from default list |

### `leads_lead_utms` → LeadUTM (1:1 with Lead)

| Column | Type |
|--------|------|
| `lead_id` | OneToOne PK/FK |
| `utm_source` | string, null |
| `utm_medium` | string, null |
| `utm_campaign` | string, null |
| `utm_content` | string, null |
| `utm_term` | string, null |

Captured from query string + hidden form fields.

### `leads_lead_notes` → LeadNote

| Column | Type |
|--------|------|
| `id` | UUID PK |
| `lead_id` | FK |
| `author_id` | FK → User |
| `body` | text |
| `created_at` | datetime |

### `leads_lead_activities` → LeadActivity

| Column | Type |
|--------|------|
| `id` | UUID PK |
| `lead_id` | FK |
| `activity_type` | enum |
| `payload` | JSON |
| `actor_id` | FK → User, null (system events null) |
| `created_at` | datetime |

**Activity types:** `created`, `status_changed`, `note_added`, `assigned`, `exported`, `form_submitted`.

### `leads_lead_assignments` → LeadAssignment (future-ready)

| Column | Type |
|--------|------|
| `id` | UUID PK |
| `lead_id` | FK |
| `assigned_to_id` | FK → User |
| `assigned_by_id` | FK → User |
| `assigned_at` | datetime |
| `unassigned_at` | datetime, null |

Phase 4 creates table + FK on Lead; **no auto-routing rules**.

### `forms_form_definitions` → reusable forms

| Column | Type |
|--------|------|
| `id` | UUID PK |
| `tenant_id` | FK |
| `name` | string |
| `slug` | string |
| `fields_schema` | JSON | field keys, required, labels |
| `spam_protection` | JSON | `{ honeypot: true, rate_limit: 5 }` — preparation only |
| `duplicate_policy` | enum | `allow`, `reject_email_24h`, `reject_phone_24h` — preparation |
| `created_at` | datetime |

### `forms_form_submissions` (audit trail)

| Column | Type |
|--------|------|
| `id` | UUID PK |
| `form_id` | FK |
| `lead_id` | FK, null | set after promotion |
| `raw_payload` | JSON |
| `created_at` | datetime |

---

## Lead lifecycle

```
                    ┌─────────────┐
   Form Submit ────►│     NEW     │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌───────────┐   ┌────────────┐   ┌─────────────┐
    │ CONTACTED │   │ UNQUALIFIED│   │  QUALIFIED  │
    └─────┬─────┘   └─────┬──────┘   └──────┬──────┘
          │               │                  │
          └───────────────┼──────────────────┘
                          ▼
                   ┌─────────────┐
                   │  CONVERTED  │
                   └──────┬──────┘
                          ▼
              ┌───────────────────────┐
              │ CLOSED / ARCHIVED      │
              └───────────────────────┘
```

**Rules:**
- Only manual status transitions via dashboard/API (no AI scoring).
- Every transition → `LeadActivity` + optional `LeadNote`.
- `converted` triggers analytics hook `lead_converted`.

---

## REST API design

Base: `/api/v1/leads/`

### Public (unauthenticated)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/public/submit/` | Create lead from form (rate-limited, honeypot) |

**Request body:**

```json
{
  "formId": "uuid",
  "pageId": "uuid",
  "pageUrl": "https://...",
  "fields": { "name": "", "phone": "", "email": "", "message": "" },
  "utm": { "source": "", "medium": "", "campaign": "", "content": "", "term": "" },
  "honeypot": ""
}
```

**Response:** `201 { "ok": true }` — no internal IDs leaked to client.

### Dashboard (authenticated)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/` | `leads.view` | List + filters + pagination |
| GET | `/{id}/` | `leads.view` | Detail + notes + activities + UTM |
| PATCH | `/{id}/` | `leads.edit` | Update fields / status |
| DELETE | `/{id}/` | `leads.delete` | Soft delete |
| POST | `/{id}/notes/` | `leads.edit` | Add note |
| GET | `/export/` | `leads.export` | CSV download (filtered) |
| GET | `/search/` | `leads.view` | Full-text search q= |

### Forms (dashboard)

| Method | Path | Permission |
|--------|------|------------|
| GET/POST | `/forms/` | `leads.view` / `leads.manage` |
| GET/PATCH | `/forms/{id}/` | `leads.view` / `leads.manage` |

### Query parameters (list)

| Param | Type |
|-------|------|
| `status` | enum |
| `source` | slug |
| `landing_page_id` | uuid |
| `q` | search string |
| `created_after` / `created_before` | ISO date |
| `sort` | `created_at`, `-created_at`, `status`, `name` |
| `page` / `page_size` | pagination |

---

## Forms & validation

### Field validation (server-side)

| Field | Rules |
|-------|-------|
| name | required if in schema; max 200 |
| phone | E.164 or local format; required if configured |
| email | RFC 5322 basic; required if configured |
| message | max 5000 |

### Spam preparation (not full product)

- Honeypot field — reject if filled
- Rate limit: 5 submissions / IP / hour per tenant
- `duplicate_policy` stub — log only in Phase 4, enforce in Phase 4.1

### Multiple forms per page

Each `contact_form` block references a `formId`. One page may have multiple blocks with different forms.

---

## Dashboard UI

Route: `/dashboard/leads`

### Lead list

- Columns: name, phone, email, status, source, landing page, created
- Filters: status, source, date range, landing page
- Search: name, phone, email, message
- Sort: created_at default desc
- Pagination: 25 per page
- Bulk status change (optional Phase 4.1)

### Lead detail

- Header: contact info + status dropdown
- UTM panel
- Landing page link (opens public URL)
- Activity timeline
- Notes thread + add note
- Technical: IP (masked), user agent, referrer

### Navigation

Add `leads` to dashboard shell — gated by `leads.view`.

---

## Permissions (new)

Add to `permission_registry.py`:

| Permission | Roles |
|------------|-------|
| `leads.view` | platform_admin, business_owner, sales_manager, marketing_manager |
| `leads.edit` | platform_admin, business_owner, sales_manager |
| `leads.delete` | platform_admin, business_owner |
| `leads.export` | platform_admin, business_owner, sales_manager |
| `leads.manage` | platform_admin, business_owner (forms CRUD) |

`editor` / `seo_manager` — no lead access by default.

---

## Analytics hooks

Server-side events (no dashboard):

| Hook | Trigger |
|------|---------|
| `lead_created` | successful public submit |
| `lead_updated` | PATCH status/fields |
| `lead_converted` | status → converted |
| `form_submitted` | public submit (before lead row) |

Implementation: `leads/application/analytics_hooks.py` — dispatches to `LeadActivity` + optional future webhook queue.

---

## CSV export

`GET /leads/export/?...filters`

Columns: id, name, phone, email, message, status, source, landing_page, page_url, utm_*, created_at.

Streaming response `text/csv`. Permission: `leads.export`.

---

## Integration points (future — not built)

| Future module | Extension point |
|---------------|-----------------|
| Lead Routing | `LeadAssignment` + rules engine reading `Lead.source` |
| CRM | webhook on `lead_created` / `lead_converted` |
| AI qualification | service listening to `lead_created`, PATCH status |
| Affiliate | `LeadUTM` + `source.slug=affiliate` |
| Notifications | email/SMS on `lead_created` |

---

## Security & privacy

- Public endpoint: no auth; tenant resolved from `formId` → tenant
- PII stored per tenant isolation
- IP storage: full IP Phase 4; document retention policy
- GDPR: soft delete leads; export for data subject requests via CSV
- WCAG 2.2 AA on dashboard lead list/detail (keyboard, labels, contrast)

---

## Testing strategy

| Layer | Tests |
|-------|-------|
| Unit | validation, status transitions, duplicate policy stub |
| API | public submit, RBAC on list/export, tenant isolation |
| E2E | landing page form → lead appears in dashboard |
| a11y | dashboard leads pages in `e2e/a11y.spec.ts` |

---

## Implementation phases (after approval)

1. **`leads` app** — models, migrations, seed sources/status enum
2. **`forms` app** — FormDefinition, submission audit
3. **Public submit API** — wire contact_form block
4. **Dashboard API** — list, detail, notes, activities, export
5. **Dashboard UI** — list + detail + filters
6. **RBAC** — permissions + seed
7. **Analytics hooks** — activity log + event stubs

---

## Dependency on Phase 3

| Dependency | Required? |
|------------|-----------|
| `contact_form` block renderer | Yes |
| `pageId` in submit payload | Yes |
| Public page route | Yes |
| Phase 3 `FormSubmission` only table | Optional — can merge into Phase 4 Lead |

**Recommendation:** skip Phase 3 `FormSubmission` table; Phase 4 `Lead` + `FormSubmission` audit is sufficient.

---

## Open questions for approval

1. **Phone/email required policy** — tenant-level default or per-form schema only?
2. **Lead assignment UI** — show assignee field in Phase 4 (manual only) or defer?
3. **Notifications** — email to business owner on new lead (simple) or strictly hooks only?
4. **Export limits** — max rows per CSV export?

---

**STOP — awaiting approval before any implementation.**
