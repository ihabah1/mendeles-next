# Mendeles API v1

Base URL: `/api/v1/`

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register/` | No | Register tenant + owner |
| POST | `/auth/login/` | No | Login; sets httpOnly refresh cookie |
| POST | `/auth/refresh/` | Cookie | Rotate refresh token |
| POST | `/auth/logout/` | Optional | Revoke refresh token |
| GET | `/auth/me/` | Bearer | Current user + permissions |
| POST | `/auth/verify-email/` | No | Verify email (required before login) |
| POST | `/auth/forgot-password/` | No | Send reset email |
| POST | `/auth/reset-password/` | No | Reset password |

## Users

| Method | Path | Permission |
|--------|------|------------|
| GET | `/users/` | users.view |
| POST | `/users/invite/` | users.invite |
| GET/PATCH/DELETE | `/users/{id}/` | users.view / edit / remove |
| POST | `/users/{id}/roles/` | users.change_roles |

## Platform

| Method | Path | Permission |
|--------|------|------------|
| GET | `/health/` | Public |
| GET/PATCH | `/settings/` | settings.view / manage |
| GET | `/audit-logs/` | audit.view |
| GET | `/roles/` | roles.view |
| GET | `/permissions/` | roles.view |

OpenAPI: `/api/v1/docs/`
