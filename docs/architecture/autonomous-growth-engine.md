# Phase 14 — Autonomous AI Growth Engine (Architecture)

> **Status:** Architecture reference only — **not authorized for implementation.**  
> **Prerequisite:** Phase X Automation Center infrastructure (implemented).  
> **Orchestration:** All long-running growth operations must execute as Automation Center jobs.

The long-term vision of Mendeles is to become an **Autonomous AI Growth Operating System**.

The platform must continuously discover opportunities, generate high-quality SEO content, monitor results, and improve itself over time.

**The objective is NOT to become an AI writer.**

**The objective is to build a self-improving growth platform.**

---

## Mission

Transform search demand into measurable business growth.

---

## End-to-end growth flow

```
Business
  ↓
AI Growth Engine
  ↓
Discover Opportunities
  ↓
Analyze Search Demand
  ↓
Prioritize Keywords
  ↓
Generate Content Plan
  ↓
Generate Landing Pages
  ↓
Generate Blog Articles
  ↓
Generate Images
  ↓
SEO Validation
  ↓
Human Approval (default)
  ↓
Publish
  ↓
Index
  ↓
Track Rankings
  ↓
Track Traffic
  ↓
Track Leads
  ↓
Optimize
  ↓
Repeat
```

---

## Autonomous growth loop

1. Collect search opportunities from connected providers.
2. Detect trending and evergreen keyword opportunities.
3. Analyze competitors.
4. Estimate business value.
5. Prioritize opportunities.
6. Build a content strategy.
7. Generate landing pages.
8. Generate blog articles.
9. Generate SEO assets.
10. Generate images.
11. Validate quality.
12. Queue for approval.
13. Publish.
14. Update sitemap.
15. Monitor indexing.
16. Monitor rankings.
17. Monitor traffic.
18. Monitor conversions.
19. Monitor leads.
20. Recommend improvements.
21. Repeat continuously.

Each step maps to an **Automation Center job** (or multi-step workflow). See [automation-center.md](./automation-center.md).

---

## Keyword intelligence

Support future integrations with:

| Provider | Purpose |
|----------|---------|
| Google Search Console | Queries, impressions, clicks, indexing |
| Google Trends | Trend detection |
| Google Ads Keyword Planner | Search volume estimates |
| DataForSEO | SERP, competition, volume APIs |
| Ahrefs | Backlinks, keywords, competition |
| SEMrush | Keywords, SERP, competition |

### Data integrity rules

- **Never fabricate keyword data.**
- If no provider is connected, clearly indicate that keyword data is unavailable.
- Search volume, popularity, and rankings must come from provider APIs or verified imports — never from model inference presented as fact.

---

## Content generation

Support generation of:

- Landing pages
- Blog articles
- FAQ
- Meta titles
- Meta descriptions
- Schema markup
- Internal links
- ALT text

### Localization

Content must support:

- Hebrew
- English
- Future multilingual expansion

Generated content is **draft** until validated and approved.

---

## Content quality

Every generated page must receive a **quality report** with explainable scores.

| Metric | Description |
|--------|-------------|
| SEO Score | On-page SEO completeness and best practices |
| Readability Score | Clarity and reading level |
| Structure Score | Headings, sections, content hierarchy |
| Internal Linking Score | Coverage and relevance of internal links |
| Accessibility Score | WCAG-oriented checks |
| Performance Score | Page weight, assets, Core Web Vitals hints |
| Originality Review | Duplicate / thin-content risk assessment |

The platform must **explain why each score was assigned** — no opaque numbers.

---

## Automation workflows

The system must support autonomous workflows through the Automation Center.

**Example:**

```
Keyword detected
  ↓
Generate strategy
  ↓
Generate draft
  ↓
Validate
  ↓
WAIT FOR APPROVAL (default)
  ↓
Publish
  ↓
Track performance
  ↓
Suggest improvements
```

### Approval default

- **Human approval is required by default** before publish.
- Auto-publishing is opt-in per tenant/workflow.
- Publishing automation jobs must respect `requires_approval` and `auto_publish_enabled` flags (Phase X).

---

## AI Operations Dashboard

Create a real-time **AI Operations Dashboard** (distinct from Automation Center job queue; may share data sources).

Display **real data only**:

| Widget | Source |
|--------|--------|
| Running Jobs | Automation Center |
| Completed Jobs | Automation Center |
| Failed Jobs | Automation Center |
| Queued Jobs | Automation Center |
| Keyword Opportunities | Provider integrations (when connected) |
| Generated Pages | Content + job history |
| Generated Articles | Content + job history |
| Published Pages | Content publish state |
| Traffic Trends | Analytics integration (future) |
| Ranking Changes | Rank tracking integration (future) |
| Lead Trends | Leads module |
| Revenue Trends | Revenue module (future) |
| Errors | Automation logs |
| Warnings | Validation + automation logs |

If a data source is not connected, show an explicit empty/unavailable state — **never placeholder metrics**.

---

## Learning loop

The platform should continuously evaluate results and recommend future content.

Examples:

- Which pages rank?
- Which pages generate leads?
- Which topics perform best?
- Which keywords underperform?

Recommendations must be grounded in **observed data** from rankings, analytics, and lead attribution — not fabricated performance.

---

## Business rules (non-negotiable)

The system must **NEVER**:

- Invent search volume.
- Invent keyword popularity.
- Invent rankings.
- Invent analytics.
- Publish automatically unless the user explicitly enables auto-publishing.
- Present generated content as guaranteed to rank.

---

## Relationship to existing phases

| Phase | Role |
|-------|------|
| Phase 2 — SEO Core | Metadata, validation, sitemap, schema foundation |
| Phase 2.5 — Content | Page model, publishing workflow |
| Phase 3 — Landing Page Engine | Block renderer, editor, public SSR (not yet implemented) |
| Phase 4 — Leads | Lead capture and attribution for conversion loop |
| Phase X — Automation Center | Job queue, workers, workflows, approval (implemented) |
| **Phase 14 — Autonomous Growth** | Strategy, AI generation, intelligence, learning loop (this document) |

---

## Implementation gate

Do **not** implement any Phase 14 module without explicit approval:

- Keyword provider integrations
- AI content generation handlers
- Rank / traffic analytics pipelines
- Autonomous publish without approval
- AI Operations Dashboard UI beyond real connected data

**STOP** — This document defines vision and architecture only.

---

## Goal

Build an **AI Growth Operating System** capable of helping businesses continuously discover opportunities, create valuable content, attract qualified visitors, and improve over time using **real data** and **responsible automation**.
