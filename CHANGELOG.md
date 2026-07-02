# Changelog

## [Unreleased]

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
