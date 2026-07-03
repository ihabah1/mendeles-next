# AI SEO Automation Center — Design Specification

> **Status:** Design first — **not authorized for implementation.**  
> **Depends on:** Phase X Automation Center (implemented), AI Provider Service (not implemented), Keyword providers (not connected).  
> **Product vision:** [master-ai-growth-vision.md](../master-ai-growth-vision.md)  
> **Orchestration:** [automation-center.md](./automation-center.md)

**Proposed route:** `/dashboard/ai-seo`

**Module name:** AI SEO Automation Center

This dashboard becomes the **command center for autonomous SEO content generation**. It is a specialized UI layer on top of the Automation Center — not a replacement for it.

---

## Objective

Allow the administrator to:

1. Discover keyword opportunities
2. Select keywords
3. Generate content
4. Review generated assets
5. Approve publishing
6. Publish to production
7. Monitor results

**Nothing publishes automatically by default.**

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│              AI SEO Automation Center (UI)                   │
├──────────────┬──────────────┬──────────────┬──────────────┤
│  Keyword     │  Content     │  Review &    │  Results &   │
│  Intelligence│  Generation  │  Approval    │  History     │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│  API Layer (REST, tenant-scoped, RBAC, audit)                │
├──────────────┬──────────────┬──────────────┬──────────────┤
│  Keyword     │  AI Provider │  Automation  │  Content /   │
│  Intelligence│  Service     │  Center Jobs │  Publish     │
│  Service     │  (Gemini)    │  (Phase X)   │  Service     │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### Design principles

| Principle | Rule |
|-----------|------|
| API first | All UI actions via REST API |
| No direct AI calls | Gemini only through **AI Provider Service** |
| Real jobs only | Batch generation creates **AutomationJob** records |
| No fabricated data | Volume, trends, rankings show **"Data unavailable"** without providers |
| Approval default | Publish requires explicit user action |
| Multi-tenant | All data scoped by `tenant_id` |
| Audit | Every action logged |

---

## Section 1 — Keyword Discovery

### Panel: Keyword Intelligence

**Filters**

| Control | Options |
|---------|---------|
| Language | Hebrew, English |
| Date range | Last 24 hours, Last 7 days, Last 30 days |

**Future providers (not connected until integrated)**

- Google Trends
- Google Search Console
- Google Keyword Planner
- DataForSEO

**Table columns**

| Column | Notes |
|--------|-------|
| Keyword | Required |
| Search volume | Provider only — never invented |
| Trend | Provider only |
| Difficulty | When available |
| Intent | Classified when provider/data supports |
| Competition | When available |
| Opportunity score | Computed from **real** provider data only |
| Source | Provider name |

**Actions:** Refresh, Search, Filter, Sort

**Empty / unavailable state**

```
Keyword data unavailable.
Please connect a supported provider.
```

---

## Section 2 — Keyword Selector

Display all discovered keywords (or manual entry when providers offline).

| Feature | Description |
|---------|-------------|
| Search | Filter keyword list |
| Filtering | By intent, source, score range |
| Sorting | Volume, opportunity, alphabetical |
| Multi-select | Checkbox per row |
| Select all | Page / filtered set |
| Counter | `N keywords selected` |
| Auto textbox | Selected keywords populate a textarea (one per line) |
| Manual add | Administrator may type additional keywords |

**Example textbox content:**

```
home insurance
mortgage calculator
roof repair
```

---

## Section 3 — Content Generation

### Actions

| Button | Creates job type(s) |
|--------|---------------------|
| Generate Blog Article | `generate_blog_article` |
| Generate Landing Page | `generate_landing_page` |
| Generate Both | Multi-step workflow |

### Options

| Group | Values |
|-------|--------|
| Language | Hebrew, English |
| Content tone | Professional, Friendly, Marketing, Formal |
| Length | Short, Medium, Long |
| Images | Generate hero image, Generate section images |
| SEO extras | Metadata, FAQ, Schema, Internal links |

All options stored on `AutomationJob.config` JSON — auditable and versioned.

---

## Section 4 — Batch Job

On **Generate**, create a **real Automation Center job** (or workflow).

**Display (from Automation API — no fabricated progress)**

| Field | Source |
|-------|--------|
| Job ID | `AutomationJob.id` |
| Status | `AutomationJob.status` |
| Progress | `AutomationJob.progress_percent` |
| ETA | `DashboardService` — `null` if not computable |
| Current step | `AutomationJobStep` name |
| Completed / Failed counts | Step tallies |
| Logs | `AutomationLog` stream |
| Queue position | `AutomationQueue` ordering |

**Step examples (workflow)**

```
Research → Planning → Generating Blog → Generating Landing Page
→ Generating Images → Generating Metadata → Generating Schema
→ SEO Validation → Completed
```

Unimplemented handlers **fail honestly** until AI/content modules are approved.

---

## Section 5 — Review Center

**Panel: Publication Review**

Generated assets appear here. **Nothing auto-publishes.**

Per item display:

| Field | Source |
|-------|--------|
| Title | Content draft |
| Slug | Content / SEO slug registry |
| SEO score | AI Quality Engine (when implemented) |
| Readability score | Quality report |
| Accessibility score | Quality report |
| Content quality | Quality report |
| Preview | Landing page preview, Blog preview |
| Generated images | Media assets |
| Generated metadata | SEO bundle |
| Generated FAQ | Content block |
| Generated schema | JSON-LD draft |
| Created time | `created_at` |

---

## Section 6 — Approval

Per generated asset:

| Action | Permission (proposed) | Effect |
|--------|----------------------|--------|
| Approve | `ai_seo.approve` | Moves to publish-ready; job → `waiting_approval` → approved |
| Reject | `ai_seo.approve` | Marks rejected; audit log |
| Edit | `ai_seo.manage` | Opens editor (Phase 3 content UI) |
| Duplicate | `ai_seo.create` | Clone draft |
| Delete | `ai_seo.manage` | Soft delete |
| Publish | `ai_seo.publish` | Queues publish job |
| Publish selected | `ai_seo.publish` | Batch publish job |

Aligns with Phase X `requires_approval` and `auto_publish_enabled=false` by default.

---

## Section 7 — Production

On **Publish**:

1. Publish to production (content publish service)
2. Update sitemap (automation job: `update_sitemap`)
3. Update RSS (when blog engine supports RSS)
4. Refresh internal links registry
5. Audit log entry
6. Publish history record
7. Return production URL(s)

All steps execute as Automation Center jobs with audit trail.

---

## Section 8 — Results

Post-publish panel:

| Field | Status |
|-------|--------|
| Production URL | Implemented with publish |
| Blog URL | Implemented with publish |
| Landing page URL | Implemented with publish |
| Published time | Real timestamp |
| Index status | Future — Search Console integration |
| Google status | Future |
| Traffic | Future — Analytics |
| Ranking | Future |
| Leads | Phase 4 attribution (future wiring) |
| Revenue | Future |

Show **"Data unavailable"** for future metrics — never placeholders.

---

## Section 9 — History

Complete immutable history:

| Event | Logged in |
|-------|-----------|
| Generated | Audit + job history |
| Published | Audit + publish history |
| Rejected | Audit + job status |
| Deleted | Audit (soft delete) |
| Edited | Content version + audit |
| Re-generated | New job linked to parent |

Filterable timeline in UI; export via audit API.

---

## Section 10 — Business rules

The system **MUST NEVER**:

- Publish automatically (unless tenant explicitly enables `auto_publish_enabled`)
- Invent search volume, keyword popularity, rankings, analytics, or SEO metrics
- Call Gemini (or any AI) outside **AI Provider Service**
- Show fake progress, queue stats, or ETA

When keyword providers are unavailable:

```
Keyword data unavailable.
Please connect a supported provider.
```

---

## AI provider

| Provider | Status |
|----------|--------|
| Google Gemini | **Design target** — not implemented |
| OpenAI, Claude, Ollama, Azure | Future-ready via same interface |

```
Module → AI Provider Service → Gemini API
```

No direct `google.generativeai` (or equivalent) imports in UI, API views, or job handlers.

---

## Proposed RBAC permissions

| Permission | Description |
|------------|-------------|
| `ai_seo.view` | View dashboard, keywords, jobs, review |
| `ai_seo.create` | Start generation jobs, add keywords |
| `ai_seo.manage` | Edit, delete, duplicate drafts |
| `ai_seo.approve` | Approve / reject generated assets |
| `ai_seo.publish` | Publish to production |
| `ai_seo.logs` | View generation and job logs |

Assign to `platform_admin`, `business_owner`, `seo_manager` (configurable).

---

## Proposed API surface (design)

Base: `/api/v1/ai-seo/`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/keywords/` | List discovered keywords (provider or empty) |
| POST | `/keywords/refresh/` | Trigger keyword sync job |
| POST | `/keywords/manual/` | Add manual keywords |
| POST | `/generate/` | Create batch generation job |
| GET | `/jobs/` | List AI SEO jobs |
| GET | `/jobs/{id}/` | Job detail + steps |
| GET | `/review/` | Publication review queue |
| POST | `/review/{id}/approve/` | Approve asset |
| POST | `/review/{id}/reject/` | Reject asset |
| POST | `/review/publish/` | Publish selected |
| GET | `/results/` | Published asset outcomes |
| GET | `/history/` | Event timeline |

All endpoints delegate job execution to **Automation Center** (`/api/v1/automation/`).

---

## Proposed data models (design)

| Model | Purpose |
|-------|---------|
| `KeywordOpportunity` | Cached provider keyword row |
| `KeywordProviderConnection` | Tenant provider credentials (encrypted) |
| `ContentGenerationDraft` | Generated asset before publish |
| `ContentQualityReport` | Scores + explanations |
| `PublishHistory` | Production URL + timestamps |
| Reuse | `AutomationJob`, `AutomationWorkflow`, `AutomationLog` |

---

## UI / UX requirements

- WCAG 2.2 AA
- Responsive (mobile admin read-only acceptable; generation on desktop)
- Dark mode + light mode (existing theme system)
- Enterprise UI — consistent with `dashboard-shell`, `StatCard`, `Card`
- Hebrew RTL + English LTR
- i18n namespace: `aiSeo`

### Dashboard layout (wireframe)

```
┌────────────────────────────────────────────────────────┐
│ AI SEO Automation Center                                │
├─────────────────┬──────────────────────────────────────┤
│ Keyword         │ Keyword Selector + Manual Add         │
│ Intelligence    │ [textarea: selected keywords]         │
├─────────────────┴──────────────────────────────────────┤
│ Content Generation Options + [Generate ▼]               │
├────────────────────────────────────────────────────────┤
│ Active Batch Job (real AutomationJob data)              │
├────────────────────────────────────────────────────────┤
│ Publication Review          │ Results / History         │
└─────────────────────────────┴──────────────────────────┘
```

---

## Relationship to existing phases

| Phase | Role in this module |
|-------|---------------------|
| Phase 2 SEO | Validation, metadata, schema at publish |
| Phase 2.5 Content | Draft storage, versions |
| Phase 3 Landing Pages | Public renderer + preview (required for full preview) |
| Phase 4 Leads | Future results attribution |
| Phase X Automation | Job queue, workers, approval, logs |
| Phase 6 AI SEO Agent | Keyword intelligence backend |
| Phase 7 AI Content Studio | Generation handlers |
| AI Provider Service | Gemini abstraction (new) |

---

## Implementation checklist (when approved)

- [ ] Architecture approval
- [ ] AI Provider Service (Gemini adapter)
- [ ] Keyword provider integration OR honest empty state
- [ ] Database models + migrations
- [ ] REST API + RBAC + audit
- [ ] Automation job handlers (blog, landing, images, metadata…)
- [ ] Frontend `/dashboard/ai-seo`
- [ ] i18n (he/en)
- [ ] Unit / integration / Playwright tests
- [ ] Accessibility review
- [ ] Documentation + changelog
- [ ] Phase completion report

---

## Implementation gate

**STOP** — This document is design only.

Do not implement UI, API, Gemini integration, or keyword providers without explicit phase approval.

When approved, implement in order:

1. AI Provider Service
2. Keyword Intelligence (or empty-state UI)
3. Generation job handlers
4. Review & approval UI
5. Publish pipeline
6. Results (real data only)
