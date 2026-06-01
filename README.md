# Mandeles — React (Next.js) frontend + Django REST backend

> **Railway deploy:** This is a monorepo. Set **Root Directory** to `frontend` (Next.js) or `backend` (Django) per service. See [RAILWAY.md](./RAILWAY.md).

This repository hosts two independently deployable applications:

| Folder      | Stack                              | Responsibility                                            |
|-------------|------------------------------------|-----------------------------------------------------------|
| `frontend/` | Next.js 16 (App Router) + React 19 | Website UI; talks to Django over REST                     |
| `backend/`  | Django 5 + Django REST Framework   | Authentication, Django Admin, REST API over the DB models |

Authentication, administration and the canonical data models live in **Django**.
The React/Next.js app is the user-facing UI and authenticates against Django
using **JWT** (`djangorestframework-simplejwt`).

---

## Project structure

```
.
├── backend/                      # Django REST API + Admin
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── mandeles_portal/          # settings / urls / wsgi / asgi
│   ├── admin_panel/
│   │   ├── accounts/             # custom User model (AUTH_USER_MODEL)
│   │   ├── portal/               # business models (orders, profiles, wallet…)
│   │   └── ai_agent/             # optional AI feature (off by default)
│   ├── api/                      # DRF app: serializers, viewsets, JWT auth
│   └── data/                     # local SQLite DB
│
├── frontend/                     # Next.js / React UI
│   ├── app/                      # routes (App Router)
│   ├── components/               # UI + ProtectedRoute
│   ├── hooks/useAuth.ts          # auth hook
│   ├── lib/
│   │   ├── api/                  # Axios client + service layers
│   │   │   ├── client.ts         # axios instance + token-refresh interceptor
│   │   │   ├── config.ts         # API base URL + endpoints
│   │   │   ├── tokens.ts         # JWT storage
│   │   │   ├── auth.ts           # auth service (login/register/logout/me)
│   │   │   ├── users.ts          # users service
│   │   │   └── content.ts        # orders/content service
│   │   └── auth/AuthContext.tsx  # global auth state (AuthProvider + useAuth)
│   └── middleware.ts             # pass-through (guarding is client-side)
│
└── README.md
```

---

## Running the backend (Django API)

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env            # then edit values

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver      # http://127.0.0.1:8000
```

- **Django Admin:** http://127.0.0.1:8000/admin/
- **REST API root:** http://127.0.0.1:8000/api/

### Backend environment variables (`backend/.env`)

| Variable                 | Default                                        | Purpose                                            |
|--------------------------|------------------------------------------------|----------------------------------------------------|
| `DJANGO_SECRET_KEY`      | dev fallback                                   | Django secret key (**set in production**)          |
| `DJANGO_DEBUG`           | `true`                                         | Debug mode                                         |
| `ALLOWED_HOSTS`          | localhost,127.0.0.1                            | Comma-separated allowed hosts                      |
| `DATABASE_URL`           | (empty → SQLite)                               | Postgres URL; falls back to local SQLite           |
| `JWT_ACCESS_MINUTES`     | `60`                                           | Access-token lifetime                              |
| `JWT_REFRESH_DAYS`       | `30`                                           | Refresh-token lifetime                             |
| `CORS_ALLOWED_ORIGINS`   | `http://localhost:3000,http://127.0.0.1:3000`  | Frontend origins allowed to call the API           |
| `CSRF_TRUSTED_ORIGINS`   | frontend origins                               | Trusted origins for session/CSRF                   |
| `ADMIN_EMAIL`            | `admin@admin.com`                              | Email treated as the portal admin                  |
| `PORTAL_DASHBOARD_ENABLED` | `false`                                      | Mount the legacy server-rendered `/manage` dashboard |
| `AI_AGENT_ENABLED`       | `false`                                        | Enable the optional AI-agent app (extra deps)      |

---

## Running the frontend (React / Next.js)

```bash
cd frontend
npm install
cp .env.example .env             # then edit values

npm run dev                      # http://localhost:3000
```

### Frontend environment variables (`frontend/.env`)

| Variable                    | Default                       | Purpose                                  |
|-----------------------------|-------------------------------|------------------------------------------|
| `NEXT_PUBLIC_API_BASE_URL`  | `http://localhost:8000/api`   | Base URL of the Django REST API          |

> The remaining `frontend/.env` keys (`DATABASE_URL`, `STRIPE_*`, `TWILIO_*`, …)
> belong to the **legacy** Next.js/Prisma API routes that still power lotto,
> wallet and Stripe. See *Migration notes* below.

---

## Authentication flow

```
┌─────────────┐  POST /api/auth/login (email,password)  ┌────────────────────┐
│  React UI   │ ──────────────────────────────────────► │  Django + SimpleJWT │
│ (AuthCtx)   │ ◄────────── { access, refresh, user } ── │                    │
└─────┬───────┘                                          └────────────────────┘
      │ store tokens (localStorage)
      │ attach `Authorization: Bearer <access>` to every request (axios interceptor)
      │ on 401 → POST /api/auth/refresh → retry once
      ▼
  Protected pages wrapped in <ProtectedRoute> (redirect to /auth if anonymous)
```

REST auth endpoints (Django):

| Method | Endpoint              | Description                              | Auth     |
|--------|-----------------------|------------------------------------------|----------|
| POST   | `/api/auth/register/` | Create account → `{access, refresh, user}` | Public   |
| POST   | `/api/auth/login/`    | Obtain tokens → `{access, refresh, user}`   | Public   |
| POST   | `/api/auth/refresh/`  | Rotate access token                       | Public   |
| POST   | `/api/auth/verify/`   | Validate a token                          | Public   |
| POST   | `/api/auth/logout/`   | Blacklist the refresh token               | Bearer   |
| GET/PATCH | `/api/auth/me/`    | Current user (read / update)              | Bearer   |

Model resources (DRF viewsets, scoped per user; staff see all):
`/api/users/`, `/api/orders/`, `/api/profiles/`, `/api/credit-accounts/`,
`/api/messages/`, `/api/permissions/`, `/api/action-logs/`.

Wallet (Django `CreditAccount`):

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wallet/balance/` | Current wallet balance |
| GET | `/api/wallet/history/` | Wallet transaction log |
| POST | `/api/wallet/topup/` | Top up (Stripe or dev credit) |

Lotto (Django `LottoSet` / `Order`):

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lotto/my-sets/` | User's 200 sets (+ `tier`) |
| POST | `/api/lotto/submit/` | Submit filled tables (charges wallet) |
| POST | `/api/lotto/subscribe/` | Purchase weekly/monthly subscription |

Admin dashboard API (staff JWT required):

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats/` | Dashboard statistics |
| GET/PATCH | `/api/admin/orders/` | List or update orders |

### Frontend usage

```tsx
import { useAuth } from "@/hooks/useAuth";

const { user, isAuthenticated, login, register, logout } = useAuth();
await login("admin@admin.com", "secret");
```

```tsx
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Page() {
  return <ProtectedRoute><Dashboard /></ProtectedRoute>;
}
// adminOnly: <ProtectedRoute adminOnly>…</ProtectedRoute>
```

All HTTP goes through the Axios layer in `frontend/lib/api/` — never hardcode
URLs; use the services (`authService`, `usersService`, `contentService`).

---

## Production deployment

The two apps deploy independently:

- **Backend:** any WSGI/ASGI host (Railway, Fly, Gunicorn + Whitenoise). Set
  `DJANGO_DEBUG=false`, a real `DJANGO_SECRET_KEY`, `DATABASE_URL`, and
  `CORS_ALLOWED_ORIGINS` to the deployed frontend origin.
- **Frontend:** Vercel / Node host. Set `NEXT_PUBLIC_API_BASE_URL` to the
  deployed backend `…/api` URL.

---

## Migration notes (legacy Next.js API)

Historically the Next.js app shipped its **own** backend (Prisma + Postgres,
JWT, Stripe, Twilio) under `frontend/app/api/*`. The integration moved
**authentication and the canonical data models to Django** without deleting
that working code, so nothing breaks during the transition:

- **Auth** is Django-backed (`AuthProvider` + `lib/api`). The old
  `app/api/auth/*` routes remain but are no longer used by the UI.
- **Profile, wallet, topup, admin orders/stats** now call the Django REST API
  via `walletService`, `contentService`, and `adminService`.
- **Lotto (my-sets + submit + subscribe)** now call Django via `lottoService`.
- **Toto / Pais / Stripe webhooks / win-check** still run on the legacy
  Next.js/Prisma API.
