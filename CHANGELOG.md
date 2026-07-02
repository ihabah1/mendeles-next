# Changelog

## [Unreleased]

### Added — Phase X Automation Center

- Django `automation` app: AutomationJob, AutomationJobStep, AutomationQueue, AutomationSchedule, AutomationExecution, AutomationLog, AutomationWorker, AutomationNotification, AutomationTemplate, AutomationWorkflow
- Database-backed job queue with priority, dependencies, approval checkpoints
- Worker architecture with heartbeat; `process_automation_queue` management command
- System job handlers: `health_check`, `cleanup`, `cache_refresh` (other types fail honestly)
- Automation API: CRUD, dashboard, queue, workers, logs, progress, pause/resume/retry/cancel/duplicate/approve/reject
- RBAC: `automation.view`, `automation.create`, `automation.manage`, `automation.approve`, `automation.cancel`, `automation.logs`
- Dashboard pages: `/dashboard/automation`, `/dashboard/automation/[id]`
- Admin control center: real automation stats (no placeholder widgets)
- Unit/API tests; Playwright E2E; accessibility coverage for automation dashboard
- Documentation: Phase X completion report, updated API and architecture docs

### Added — Phase 4 Lead Generation Engine

- Django `leads` app: Lead, LeadSource, LeadUTM, LeadNote, LeadActivity, FormDefinition, FormSubmission
- Lead API: list, create, detail, update, delete, notes, export CSV, statuses, forms, public submit
- RBAC permissions: `leads.view`, `leads.edit`, `leads.delete`, `leads.export`, `leads.manage`
- Dashboard pages: `/dashboard/leads`, `/dashboard/leads/[id]`
- Reusable `LeadCaptureForm` component for landing pages
- Rate limiting + honeypot on public lead submit
- Unit and API tests; Playwright E2E for leads dashboard
- Documentation: Phase 4 completion report, updated API and architecture docs

### Added — Control center visibility

- Admin overview: login stats (7 days), landing page counts, recent logins list, recent landing pages list
- Dashboard control center UI cards and panels for logins and landing pages
