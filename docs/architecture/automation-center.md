# Phase X — Automation Center (Architecture)

> **Status:** Implemented (Phase X infrastructure). Job handlers for AI/external providers are not enabled.

The Automation Center is the orchestration engine of Mendeles.

Every module in the platform must be able to trigger automated jobs.

Users must have complete control over automation through the dashboard.

---

## Automation dashboard

Create a dedicated Automation Center.

### Dashboard widgets

- Active Jobs
- Scheduled Jobs
- Running Jobs
- Completed Jobs
- Failed Jobs
- Queue
- Upcoming Jobs
- Job History
- Credits Used
- Estimated Completion Time

**Route (proposed):** `/dashboard/automation`

---

## Scheduler

Support scheduling:

- Immediately
- Specific Date & Time
- Daily
- Weekly
- Monthly
- Every X Hours
- Every X Days
- Cron Expression (Advanced)

**Timezone aware.**

---

## Job types

### SEO

- [ ] Keyword Research
- [ ] Competitor Scan
- [ ] Search Console Sync
- [ ] Google Trends Sync
- [ ] Rank Tracking

### Content

- [ ] Generate Blog Articles
- [ ] Generate Landing Pages
- [ ] Rewrite Existing Articles
- [ ] Refresh Old Content
- [ ] Generate FAQs
- [ ] Generate Metadata
- [ ] Generate Schema

### Media

- [ ] Generate Images
- [ ] Compress Images
- [ ] Generate ALT Text

### Publishing

- [ ] Publish Pages
- [ ] Schedule Publishing
- [ ] Archive Pages
- [ ] Update Sitemap
- [ ] Ping Search Engines

### Analytics

- [ ] Refresh Analytics
- [ ] Generate Reports
- [ ] SEO Health Scan
- [ ] Broken Link Scan

### Marketing

- [ ] Email Campaign
- [ ] WhatsApp Campaign
- [ ] SMS Campaign
- [ ] Lead Follow-up

### System

- [ ] Database Backup
- [ ] Cleanup Logs
- [ ] Cache Refresh
- [ ] Health Check

---

## Batch processing

Every job supports:

- Queue
- Pause
- Resume
- Cancel
- Retry Failed
- Clone Job

---

## Job progress

Each job displays:

- Status
- Progress %
- Current Step
- Completed Tasks
- Failed Tasks
- Remaining Tasks
- ETA
- Started At
- Finished At

---

## Dependencies

Support execution rules.

Example pipeline:

```
Keyword Research
        ↓
Content Planning
        ↓
Generate Landing Pages
        ↓
Generate Blog Articles
        ↓
Generate Images
        ↓
SEO Validation
        ↓
Schedule Publishing
        ↓
Update Sitemap
```

---

## Automation rules

Allow users to create workflows.

Examples:

- When a keyword opportunity is found → create a draft article.
- When an article reaches SEO Score > 90 → schedule publishing.
- When a page loses ranking → create an optimization task.
- When a lead is created → notify the business owner.

---

## Manual approval

Support approval checkpoints.

Example:

```
Generate Article
        ↓
WAIT FOR APPROVAL
        ↓
Publish
```

**The system must never publish content automatically unless the user explicitly enables automatic publishing.**

Automatic publishing must be an **opt-in** feature configurable per workflow.

---

## Notifications

Notify users when:

- Job Completed
- Job Failed
- Approval Required
- New SEO Opportunity
- High Priority Issue
- Scheduled Job Started

### Channels

- In-App
- Email
- WhatsApp (Future)
- Push (Future)

---

## History

Maintain complete job history.

Every execution must include:

- User
- Trigger
- Duration
- Result
- Logs
- Errors
- Retry Count

---

## API (proposed)

Base: `/api/v1/automation/`

Everything must be API First.

| Operation | Description |
|-----------|-------------|
| Create Job | Enqueue or schedule a job |
| Update Job | Modify schedule or parameters |
| Cancel Job | Cancel pending/running job |
| Pause Job | Pause queue or job |
| Resume Job | Resume paused job |
| Retry Job | Retry failed execution |
| Duplicate Job | Clone job definition |
| View History | List executions with filters |

RBAC permissions (proposed): `automation.view`, `automation.create`, `automation.manage`, `automation.approve`.

---

## Quality requirements

The Automation Center must support **thousands of scheduled jobs** while remaining:

- Scalable
- Fault-tolerant
- Production-ready

### Proposed backend components

- Job queue (e.g. Celery / Redis or equivalent)
- `AutomationJob`, `JobExecution`, `JobSchedule`, `WorkflowRule`, `ApprovalCheckpoint` models
- Tenant-scoped job isolation
- Idempotent job handlers
- Dead-letter queue for failed jobs
- Audit log on every state transition

---

## Constraints (mandatory)

1. **Automation must never fabricate SEO data, rankings or analytics.** All external metrics must come from connected providers.
2. **Publishing actions require explicit user approval by default.**
3. **Automatic publishing is opt-in** per workflow.
4. Align with [Business Constraints](../master-enterprise-checklist.md#20-business-rules) in the enterprise checklist.

---

## Relationship to other phases

| Phase | Relationship |
|-------|--------------|
| 3 — Landing Pages | Publishing jobs, sitemap updates |
| 4 — Leads | Lead follow-up triggers |
| 6 — AI SEO Agent | Keyword research, rank tracking jobs |
| 7 — AI Content Studio | Content generation jobs |
| 8 — AI Optimization | Refresh, validation jobs |
| 9 — Marketing Automation | Campaign jobs |
| 11 — Analytics | Report and health scan jobs |
| 14 — Autonomous Growth | Strategy orchestration — see [autonomous-growth-engine.md](./autonomous-growth-engine.md) |

---

## Implementation checklist (when approved)

- [ ] Architecture approval
- [ ] Database models + migrations
- [ ] Job queue infrastructure
- [ ] REST API + RBAC
- [ ] Automation dashboard UI
- [ ] Scheduler (timezone-aware)
- [ ] Approval checkpoints
- [ ] Notifications (in-app + email)
- [ ] Unit + integration + E2E tests
- [ ] Documentation + changelog
- [ ] Phase completion report

**Do not begin implementation without explicit approval.**
