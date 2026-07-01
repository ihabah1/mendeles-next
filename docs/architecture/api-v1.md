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

## SEO (Phase 2)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET/PATCH | `/seo/settings/` | seo.view / seo.manage | Global SEO settings |
| GET | `/seo/status/` | seo.view | SEO health score |
| POST | `/seo/validate/` | seo.view | Validate page or global SEO |
| POST | `/seo/metadata/` | seo.view | Build metadata + schemas |
| GET | `/seo/sitemap/` | Public | Sitemap entries (JSON) |
| GET | `/seo/robots/` | Public | robots.txt content |
| GET | `/seo/public/` | Public | SSR SEO bundle |
| GET/POST | `/seo/redirects/` | seo.view / seo.manage | Redirect registry |
| POST | `/seo/slugs/generate/` | seo.manage | Generate unique slug |

See [SEO architecture](seo.md).

## Content (Phase 2.5)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET/POST | `/content/pages/` | content.view / create | List or create pages |
| GET/PATCH/DELETE | `/content/pages/{id}/` | view / edit / delete | Page detail |
| POST | `/content/pages/{id}/publish/` | content.publish | Publishing workflow |
| GET | `/content/pages/{id}/versions/` | content.view | Version history |
| GET/POST | `/content/pages/{id}/blocks/` | view / edit | Content blocks |
| POST | `/content/pages/{id}/duplicate/` | content.create | Duplicate page as draft |
| GET/POST | `/content/media/` | view / create | Media assets |
| GET/POST | `/content/pages/{id}/links/` | view / edit | Internal links |
| GET/POST | `/content/taxonomies/` | view / create | Taxonomies |
| GET/POST | `/content/taxonomies/{id}/terms/` | view / create | Categories & tags |
| GET/POST | `/content/templates/` | view / create | Page templates |

See [Content architecture](content.md).

OpenAPI: `/api/v1/docs/`
