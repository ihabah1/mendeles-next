# Deploying on Railway

This repo is a **monorepo** (Django API + Next.js UI). Use **two Railway services** from the same GitHub repo.

Repo: [ihabah1/mendeles-next](https://github.com/ihabah1/mendeles-next)

---

## 1. Backend (Django API)

| Setting | Value |
|---------|--------|
| **Root Directory** | `backend` *(recommended)* or repo root |
| **Start command** | auto from `railway.toml` / `start.sh` |

### Required variables

| Variable | Example |
|----------|---------|
| `DJANGO_SECRET_KEY` | long random string |
| `DJANGO_DEBUG` | `false` |
| `DATABASE_URL` | Postgres plugin URL *(Railway adds automatically)* |
| `ALLOWED_HOSTS` | `${{RAILWAY_PUBLIC_DOMAIN}}` |
| `CORS_ALLOWED_ORIGINS` | `https://your-frontend.up.railway.app` |
| `FRONTEND_URL` | same as frontend public URL |
| `BOOTSTRAP_ADMIN_EMAIL` | `admin@admin.com` |
| `BOOTSTRAP_ADMIN_PASSWORD` | strong password |

### Optional

| Variable | Purpose |
|----------|---------|
| `PORTAL_DASHBOARD_ENABLED` | `true` for `/manage` dashboard |
| `AI_AGENT_ENABLED` | `true` for AI agent |
| `GEMINI_API_KEY` | AI feature |
| `GITHUB_TOKEN` / `GITHUB_REPO` | AI PR creation |

On deploy, `start.sh` runs: **migrate → collectstatic → ensure_superuser → gunicorn**.

Health check: `GET /` returns JSON API landing page.

---

## 2. Frontend (Next.js)

Create a **second service** in the same Railway project:

| Setting | Value |
|---------|--------|
| **Root Directory** | `frontend` |
| **Build** | `npm ci && npm run build` |
| **Start** | `npm start` |

### Required variables

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://your-backend.up.railway.app/api` |

---

## Troubleshooting

### "Railpack could not determine how to build" / only `README.md`

1. Confirm GitHub repo is **`ihabah1/mendeles-next`** branch **`main`** (not an empty repo).
2. In Railway → Service → **Settings → Source** → **Root Directory**:
   - Backend: `backend` (or leave empty if using root `requirements.txt` + `start.sh`)
   - Frontend: `frontend`
3. Click **Redeploy** after changing root directory.

### Build sees 10 KB / single file

Railway is building the wrong commit or wrong repo. Re-link the service to `mendeles-next` and redeploy.

---

## Local parity

```bash
# Backend
cd backend && pip install -r requirements.txt
python manage.py migrate
gunicorn mandeles_portal.wsgi:application --bind 127.0.0.1:8000

# Frontend
cd frontend && npm ci && npm run dev
```
