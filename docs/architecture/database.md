# Database Schema (Phase 1)

## tenants

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | varchar | Organization name |
| slug | slug | Unique |
| status | enum | active / suspended / trial |
| settings | JSON | Tenant-level settings |
| created_at, updated_at, deleted_at | timestamp | Soft delete via `deleted_at` |

## users (identity)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| email | varchar | Unique login |
| password | hash | Argon2 |
| first_name, last_name | varchar | |
| default_tenant_id | FK → tenants | |
| is_active, is_staff, is_superuser | bool | |
| email_verified_at | timestamp | Required before login |
| preferred_locale | varchar | he / en |
| created_at, updated_at, deleted_at | timestamp | |

## roles / permissions (rbac)

- **permissions** — codename (`users.view`), module, action
- **roles** — slug, name, optional tenant FK, `is_system`
- **role_permissions** — M2M role ↔ permission
- **user_roles** — user ↔ role ↔ tenant

## audit_logs

| Column | Type |
|--------|------|
| tenant_id, user_id | FK (nullable) |
| action | varchar |
| resource_type, resource_id | varchar / UUID |
| metadata | JSON |
| ip_address, user_agent | varchar |
| created_at | timestamp |

## system_settings (siteconfig)

Key/value settings scoped by tenant (e.g. `company.name`).

## Auth tokens

- **email_verification_tokens** — hashed token, expiry
- **password_reset_tokens** — hashed token, expiry
- **refresh_tokens** — hashed token, rotation, revocation

Migrations: `python manage.py migrate`  
Seed RBAC: `python manage.py seed_rbac`
