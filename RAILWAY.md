# Railway — הגדרה ללוגין

Frontend: https://mendeles-next-production.up.railway.app

---

## הבעיה: "שירת ה-API לא מוגדר"

זה אומר ש**חסר משתנה סביבה** בשירות ה-Frontend, ו/או **אין שירות Backend**.

---

## שלב א — צור שירות Backend (אם אין)

1. ב-Railway → הפרויקט → **+ New** → **GitHub Repo** → `ihabah1/mendeles-next`
2. **Settings** של השירות החדש:
   - **Root Directory:** `backend`
   - **Builder:** Dockerfile
3. **+ New** → **Database** → **PostgreSQL** (אם אין)
4. **Variables** (שירות Backend):

```
DJANGO_SECRET_KEY=change-me-to-random-32-chars-minimum
DJANGO_DEBUG=false
DATABASE_URL=${{Postgres.DATABASE_URL}}
ALLOWED_HOSTS=${{RAILWAY_PUBLIC_DOMAIN}}
BOOTSTRAP_ADMIN_EMAIL=admin@admin.com
BOOTSTRAP_ADMIN_PASSWORD=admin
CORS_ALLOWED_ORIGINS=https://mendeles-next-production.up.railway.app
FRONTEND_URL=https://mendeles-next-production.up.railway.app
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=Mandeles <noreply@yourdomain.com>
```

> **אימות אימייל:** `RESEND_API_KEY` + `RESEND_FROM_EMAIL` + `FRONTEND_URL` ב-**Backend**.  
> **או** — אותם `RESEND_*` ב-**Frontend** + `EMAIL_PROXY_SECRET` **זהה** בשני השירותים.

### Frontend — משתנים נוספים

```
API_BASE_URL=https://eloquent-perfection-production-de3d.up.railway.app/api
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=Mandeles <noreply@mandeles.co.il>
EMAIL_PROXY_SECRET=בחר-מחרוזת-ארוכה-אקראית
```

5. **Settings** → **Networking** → **Generate Domain**
6. העתק את ה-URL, למשל: `https://mandeles-backend-xxxx.up.railway.app`
7. בדוק בדפדפן: `https://<backend-url>/api/` → JSON

---

## שלב ב — חבר Frontend ל-Backend

1. Railway → שירות **Frontend** (mendeles-next-production)
2. **Variables** → **+ New Variable**:

```
API_BASE_URL=https://<backend-url>.up.railway.app/api
```

**דוגמה:**
```
API_BASE_URL=https://mandeles-backend-xxxx.up.railway.app/api
```

**או** עם Reference (אם שם השירות ב-Railway הוא `backend`):
```
API_BASE_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}/api
```

3. **Deploy** → **Restart** (או Redeploy)

> **חשוב:** אם שינויים בקוד לא מופיעים באתר — ב-Railway → Frontend → **Deployments** בדוק שה-build האחרון **Succeeded**.  
> אם נכשל, לחץ **Redeploy**.  
> בדיקת גרסה: `GET /api/version` → השדה `commit` צריך להתאים ל-commit האחרון ב-GitHub.

### Root Directory — Frontend

| הגדרה | Dockerfile |
|--------|------------|
| ריק (שורש repo) | `Dockerfile.frontend` |
| `frontend` | `frontend/Dockerfile` |

> **אל** תשאיר `DATABASE_URL` עם `127.0.0.1` — זה dummy ל-build בלבד.

### Frontend — DATABASE_URL (Prisma, אופציונלי)

Auth ולוטו ב-production עוברים דרך **Django** (`API_BASE_URL`).  
**אין חובה** לחבר Postgres ל-Frontend.

| מצב | מה לעשות |
|-----|----------|
| רק Django | אל תגדיר `DATABASE_URL` ב-Frontend — הסטטיסטיקות יציגו 0 בלי שגיאות Prisma |
| Legacy Prisma (API ישן) | הוסף `DATABASE_URL=${{Postgres.DATABASE_URL}}` ב-Frontend |

> **אל** תשאיר `DATABASE_URL` עם `127.0.0.1` — זה dummy ל-build בלבד.

---

## בדיקה

| URL | תוצאה צפויה |
|-----|-------------|
| `/api/runtime-config` | `"configured": true`, `"backendReachable": true` |
| `/django-api/` | JSON מ-Django |
| `/auth` | כניסה עם `admin@admin.com` / `admin` |

---

## שגיאות

| הודעה | פתרון |
|--------|--------|
| שירת ה-API לא מוגדר | הוסף `API_BASE_URL` ב-Frontend + Restart |
| לא ניתן להגיע ל-backend | Backend לא רץ — בדוק Logs + Postgres |
| Backend 404 | שירות Backend לא קיים או Root Directory שגוי |
| `Can't reach database server at 127.0.0.1:5432` (Frontend) | מחק `DATABASE_URL` מ-Frontend או חבר `${{Postgres.DATABASE_URL}}`; Redeploy |
