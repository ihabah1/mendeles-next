# Railway deploy — שני שירותים חובה

Frontend: https://mendeles-next-production.up.railway.app  
Repo: **ihabah1/mendeles-next** · branch: **main**

---

## שלב 1 — Backend (Django) — **חובה ללוגין**

| Setting | Value |
|---------|--------|
| Root Directory | **`backend`** |
| Builder | **Dockerfile** |

### Variables
```
DJANGO_SECRET_KEY=<random-long-string>
DJANGO_DEBUG=false
DATABASE_URL=${{Postgres.DATABASE_URL}}
ALLOWED_HOSTS=${{RAILWAY_PUBLIC_DOMAIN}}
BOOTSTRAP_ADMIN_EMAIL=admin@admin.com
BOOTSTRAP_ADMIN_PASSWORD=admin
CORS_ALLOWED_ORIGINS=https://mendeles-next-production.up.railway.app
FRONTEND_URL=https://mendeles-next-production.up.railway.app
```

הוסף **PostgreSQL** plugin לפרויקט.

אחרי deploy — בדוק: `https://<backend-url>/api/` → JSON

---

## שלב 2 — Frontend (Next.js)

| Setting | Value |
|---------|--------|
| Root Directory | **ריק** (repo root) |
| Builder | **Dockerfile** → `Dockerfile.frontend` |

### Variables (חובה!)
```
API_BASE_URL=https://<backend-url>.up.railway.app/api
```

דוגמה:
```
API_BASE_URL=https://mandeles-backend-xxxx.up.railway.app/api
```

> הפרונט מעביר בקשות דרך `/django-api/*` (proxy) — אין בעיית CORS.  
> **Restart** אחרי שינוי `API_BASE_URL` (לא חייב rebuild).

---

## בדיקה

1. Backend: `curl https://<backend>/api/`
2. Frontend: התחבר ב-https://mendeles-next-production.up.railway.app/auth  
   `admin@admin.com` / `admin`

---

## שגיאות נפוצות

| שגיאה | פתרון |
|--------|--------|
| לא ניתן להתחבר לשרver Django (8000) | הגדר `API_BASE_URL` + deploy backend + **Redeploy** frontend |
| CORS error | הוסף frontend URL ל-`CORS_ALLOWED_ORIGINS` ב-backend |
| Backend 404 Application not found | שירות backend לא קיים — צור שירות חדש |
