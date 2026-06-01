# Deploying on Railway

> **Monorepo:** הקוד לא בשורש — יש שני תיקיות: `backend/` (Django) ו-`frontend/` (Next.js).  
> **חובה** להגדיר **Root Directory** נפרד לכל שירות, אחרת Railway רואה רק `README.md`.

This repo is a **monorepo** (Django API + Next.js UI). Use **two Railway services** from the same GitHub repo.

Repo: [ihabah1/mendeles-next](https://github.com/ihabah1/mendeles-next)

---

## 1. Backend (Django API)

| Setting | Value |
|---------|--------|
| **Root Directory** | `backend` |
| **Builder** | Railpack (default) or Dockerfile |

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
| **Repository** | `ihabah1/mendeles-next` |
| **Branch** | `main` |
| **Root Directory** | **`frontend`** ← חובה! לא להשאיר ריק |
| **Builder** | **Dockerfile** (recommended) or Railpack |

### Railway UI path

```
Project → [Frontend Service] → Settings → Source
  Connected Repo: ihabah1/mendeles-next
  Branch: main
  Root Directory: frontend    ← type exactly this, no slash
→ Save → Deploy → Redeploy
```

### Required variables

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://your-backend.up.railway.app/api` |

---

## Troubleshooting

### "Only README.md" / "Push Next.js source code"

**הסיבה:** Root Directory ריק או שגוי — Railway בונה מהשורש שיש בו רק README + קבצי backend.

**פתרון:**
1. ודא שה-repo הוא **`ihabah1/mendeles-next`** (לא repo ריק אחר)
2. **Frontend service** → Root Directory = **`frontend`**
3. **Backend service** → Root Directory = **`backend`**
4. **Redeploy** (לא רק Restart)

Verify on GitHub: `frontend/package.json` and `frontend/next.config.ts` exist on `main`.

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
