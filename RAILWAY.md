# Railway deploy — שני שירותים מאותו repo

Repo: **ihabah1/mendeles-next** · branch: **main**

---

## שירות Frontend (Next.js)

| Setting | Value |
|---------|--------|
| Connected repo | `ihabah1/mendeles-next` |
| Branch | `main` |
| **Root Directory** | **ריק** (repo root) — או `frontend` |
| **Builder** | **Dockerfile** |

### אם Root Directory ריק (מומלץ עכשיו)
- Builder: **Dockerfile**
- Dockerfile path: **`Dockerfile.frontend`** (מוגדר ב-`railway.toml`)

### אם Root Directory = `frontend`
- Builder: **Dockerfile**
- Dockerfile path: **`Dockerfile`**

### Variables
```
# Runtime — אין צורך ב-rebuild:
API_BASE_URL=https://<backend-domain>.up.railway.app/api
```

---

## שירות Backend (Django)

| Setting | Value |
|---------|--------|
| Root Directory | **`backend`** ← חובה |
| Builder | **Dockerfile** |

### Variables
```
DJANGO_SECRET_KEY=<random>
DJANGO_DEBUG=false
DATABASE_URL=${{Postgres.DATABASE_URL}}
ALLOWED_HOSTS=${{RAILWAY_PUBLIC_DOMAIN}}
CORS_ALLOWED_ORIGINS=https://<frontend-domain>.up.railway.app
FRONTEND_URL=https://<frontend-domain>.up.railway.app
BOOTSTRAP_ADMIN_EMAIL=admin@admin.com
BOOTSTRAP_ADMIN_PASSWORD=<password>
```

---

## שגיאה: "only README.md"

1. **Settings → Source** — ודא repo = `ihabah1/mendeles-next` (לא repo ריק אחר)
2. **Disconnect** → **Connect again** → בחר `mendeles-next`
3. **Builder = Dockerfile** (לא Railpack)
4. **Deploy** → **Redeploy** (לא Restart)

ב-GitHub אמורים להיות: `frontend/package.json`, `Dockerfile.frontend`, `backend/Dockerfile`
