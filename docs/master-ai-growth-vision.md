# Mendeles — Master AI Growth Vision

**Final Product Specification · Version 1.0**

> **Status:** Product vision and architecture reference only — **not authorized for implementation.**  
> **Governance:** See [master-development-roadmap.md](./master-development-roadmap.md) for approved phases.  
> **Orchestration:** All long-running operations execute through [Automation Center](./architecture/automation-center.md) (Phase X — infrastructure implemented).

---

## Mission

Mendeles is an **Enterprise AI Growth Operating System**.

Its purpose is **NOT** to be another AI writer.

Its purpose is to become an autonomous platform that:

- Discovers opportunities
- Creates high-quality SEO assets
- Attracts organic traffic
- Generates qualified leads
- Measures business growth
- Continuously improves itself

The platform should eventually manage the **complete organic growth lifecycle**.

---

## Core philosophy

Everything starts from business goals.

```
Business Goals
  ↓
Market Research
  ↓
SEO Intelligence
  ↓
AI Strategy
  ↓
Content Planning
  ↓
Content Creation
  ↓
Publishing
  ↓
Traffic
  ↓
Leads
  ↓
Revenue
  ↓
Optimization
  ↓
Continuous Growth
```

---

## Current AI provider

**Currently supported (future):** Google Gemini

**Future-ready providers:**

- OpenAI
- Anthropic Claude
- Ollama
- Azure OpenAI

### AI provider rules

- Every AI request **MUST** go through an **AI Provider Service**
- **No module** may communicate directly with Gemini (or any provider)
- All providers must implement the **same interface**

---

## Core AI modules

| Module | Purpose |
|--------|---------|
| AI Provider Service | Unified provider abstraction |
| AI Prompt Library | Central prompt repository |
| Prompt Versioning | Track prompt evolution |
| Prompt Templates | Reusable templates |
| Prompt Variables | Dynamic injection |
| Prompt History | Audit trail |
| Prompt Testing | Sandbox evaluation |
| Prompt Analytics | Performance metrics |
| AI Agents | Task-oriented agents |
| AI Queue | Job queue for AI workloads |
| AI Workers | Horizontal scaling |
| AI Logs | Traceability |
| AI Usage | Consumption tracking |
| AI Credits | Billing / quotas |
| AI Settings | Tenant configuration |

---

## SEO operating system

The SEO system must become the **brain** of the platform.

| Module | Description |
|--------|-------------|
| Keyword Intelligence | Discovery and analysis |
| Keyword Database | Central keyword store |
| Search Intent Detection | Classify query intent |
| Keyword Clustering | Group related terms |
| Competition Analysis | SERP and competitor insight |
| Search Trends | Trend detection |
| Topic Clusters | Content architecture |
| Content Calendar | Planning schedule |
| Opportunity Detection | Surface growth opportunities |
| Keyword Prioritization | Business-value ranking |
| Content Recommendations | Actionable suggestions |
| Ranking Tracking | Position monitoring |
| Index Monitoring | Google index status |
| SERP Monitoring | SERP feature tracking |
| SEO Validation | Quality gates |

### Keyword intelligence — provider integrations (future)

- Google Search Console
- Google Trends
- Google Keyword Planner
- DataForSEO
- Ahrefs
- SEMrush

**Never fabricate:** keyword volume, competition, difficulty, rankings, or traffic.  
If providers are not connected, display: **"Data unavailable"**.

---

## AI content studio

Generate:

- Landing pages
- Blog articles
- FAQ
- Meta titles & descriptions
- Schema markup
- Open Graph & Twitter Cards
- Internal links
- ALT text
- CTA copy
- Headlines, hero sections, benefits, features
- Testimonials layout
- Comparison tables
- Location, service, and category pages

---

## AI media studio

**Generate:** hero images, section images, backgrounds, illustrations, icons, variations, image prompts.

**Optimize:** compression, formats, responsive images, ALT text.

---

## Landing page engine

Unlimited landing pages with reusable blocks, themes, templates, draft/preview/publish/archive/schedule, version history, SEO integration, accessibility, and analytics.

> **Status:** Phase 3 — not yet implemented. See [landing-page-engine.md](./architecture/landing-page-engine.md).

---

## Blog engine

Rich text, Markdown, categories, tags, related articles, featured images, article schema, SEO validation, publishing workflow.

---

## Lead generation

**Capture:** name, phone, email, message, landing page, campaign, UTM, referrer, IP, user agent.

**Manage:** status, notes, activity, assignment, scoring, qualification, CSV export.

> **Status:** Phase 4 — implemented. See [lead-generation-engine.md](./architecture/lead-generation-engine.md).

---

## Automation center

Everything executes as **Jobs**.

Support: run now, scheduled, recurring, queue, batch, pause, resume, retry, cancel, approval, history, logs, workers, notifications.

> **Status:** Phase X infrastructure — implemented. Handlers for AI/external providers await approval.

### Automation job types

Keyword research · competition scan · trend scan · generate landing pages · generate blog articles · generate images · generate metadata · generate schema · generate internal links · SEO validation · publishing · analytics refresh · reports · backup · cleanup

---

## Workflow builder

Visual multi-step workflows with approval checkpoints.

**Example:**

```
Keyword Opportunity
  ↓
Research
  ↓
SEO Strategy
  ↓
Generate Landing Page
  ↓
Generate Blog
  ↓
Generate Images
  ↓
Generate Schema
  ↓
SEO Validation
  ↓
WAIT FOR APPROVAL
  ↓
Publish
  ↓
Update Sitemap
  ↓
Notify User
```

---

## Batch engine

Massive generation (e.g. 100 landing pages, 500 blog articles, 1000 images, 200 FAQ pages).

Progress must display: queued, running, completed, failed, ETA, current step.

---

## AI quality engine

Every generated page receives explainable scores:

| Metric | Description |
|--------|-------------|
| SEO Score | On-page SEO completeness |
| Readability Score | Clarity and reading level |
| Accessibility Score | WCAG-oriented checks |
| Performance Score | Weight and CWV hints |
| Content Quality Score | Depth and relevance |
| Internal Linking Score | Link coverage |
| Metadata Score | Title, description, OG |
| Schema Score | Structured data validity |
| Improvement Suggestions | Actionable fixes |
| Overall Score | Weighted composite |

---

## Content optimization

**Detect:** missing keywords, weak headings, missing FAQ, duplicate content, weak CTA, poor metadata, broken links, thin content.

**Suggest:** rewrite, expand, refresh, improve.

---

## Multi-language

**Current:** Hebrew, English

**Future-ready:** Arabic, French, German, Spanish, Italian, Portuguese

---

## SEO command center

Dashboard widgets: keyword opportunities, trending topics, keyword database, search demand, content queue, publishing queue, AI queue, batch jobs, traffic, rankings, leads, revenue, SEO health, content health.

**All widgets must show real data or explicit "unavailable" states — never fabricated metrics.**

---

## Command center

Real-time monitoring: running jobs, workers, queues, errors, warnings, notifications, logs, credits used, average runtime, success rate.

---

## Analytics

Traffic, sessions, visitors, CTR, bounce rate, time on page, conversions, leads, revenue, ROI, landing/blog performance, top keywords, top pages.

---

## Client portal

Dashboard, landing pages, blog, leads, analytics, automation, AI, users, branding, domains.

---

## White label

Own domain, logo, colors, emails, agency dashboard.

---

## Integrations (future)

| Category | Services |
|----------|----------|
| Google | Search Console, Analytics, Tag Manager, Trends, Ads |
| Affiliate | ClickOn, AffiliaXe |
| Comms | Resend, WhatsApp |
| Payments | Stripe, Tranzila, Meshulam |

---

## Security

JWT · RBAC · rate limiting · CSP · CSRF · XSS protection · input validation · audit logging · secrets management · encryption

---

## Accessibility

WCAG 2.2 AA · keyboard navigation · screen reader · high contrast · RTL · accessibility settings · accessibility statement

---

## Performance

SSR · lazy loading · caching · compression · image optimization · code splitting · Core Web Vitals

---

## DevOps

Docker · Railway · CI/CD · monitoring · health checks · automatic backups · restore procedures

---

## Business rules (non-negotiable)

The system **MUST NEVER**:

- Invent keyword data, search volume, rankings, analytics, traffic, or revenue
- Invent testimonials or customers
- Misrepresent AI capabilities
- Publish content automatically unless the user explicitly enables auto-publishing
- Delete production data without explicit confirmation

---

## Autonomous growth loop

```
Business
  ↓
Gemini AI (via AI Provider Service)
  ↓
Keyword Intelligence
  ↓
Competitor Analysis
  ↓
Opportunity Detection
  ↓
SEO Strategy
  ↓
Content Planning
  ↓
Landing Page Generation
  ↓
Blog Generation
  ↓
Image Generation
  ↓
Metadata Generation
  ↓
Schema Generation
  ↓
SEO Validation
  ↓
WAIT FOR APPROVAL (default)
  ↓
Publishing
  ↓
Google Indexing
  ↓
Ranking Monitoring
  ↓
Traffic Monitoring
  ↓
Lead Generation
  ↓
Revenue Monitoring
  ↓
AI Optimization
  ↓
Continuous Improvement
```

---

## Final product goal

Mendeles must become an **Enterprise AI Growth Operating System** — a platform capable of helping businesses continuously discover opportunities, generate valuable SEO content, attract qualified organic traffic, convert visitors into leads, measure business impact, and continuously improve using **real data** and **responsible AI**.

Every architectural decision, every feature, and every future module must support this vision.

---

## Related documents

| Document | Scope |
|----------|-------|
| [master-development-roadmap.md](./master-development-roadmap.md) | Phased implementation plan |
| [master-enterprise-checklist.md](./master-enterprise-checklist.md) | Production readiness tracker |
| [autonomous-growth-engine.md](./architecture/autonomous-growth-engine.md) | Phase 14 architecture |
| [automation-center.md](./architecture/automation-center.md) | Phase X orchestration (implemented) |
| [lead-generation-engine.md](./architecture/lead-generation-engine.md) | Phase 4 (implemented) |
| [landing-page-engine.md](./architecture/landing-page-engine.md) | Phase 3 (planned) |

---

## Implementation gate

**STOP** — Do not implement AI providers, content generation, keyword intelligence, analytics pipelines, or autonomous publishing without explicit phase approval.
