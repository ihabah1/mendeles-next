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

> **אימות אימייל:** `RESEND_API_KEY` + `RESEND_FROM_EMAIL` + `FRONTEND_URL` ב-**שירות Backend** (`eloquent-perfection` — Root Directory `backend`).  
> **או** — `RESEND_*` ב-**Frontend** + `EMAIL_PROXY_DERIVE_FROM=${{eloquent-perfection.DJANGO_SECRET_KEY}}`.  
> בדיקה: `GET https://<backend>/api/auth/email-status/` → `configured: true` או `send_path: "frontend"`.

### Frontend — משתנים (מספיק לשליחת אימייל בלי Resend ב-Backend)

```
API_BASE_URL=https://eloquent-perfection-production-de3d.up.railway.app/api
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=Mandeles <noreply@mandeles.co.il>
EMAIL_PROXY_DERIVE_FROM=${{eloquent-perfection.DJANGO_SECRET_KEY}}
```

> `EMAIL_PROXY_DERIVE_FROM` מקשר ל-`DJANGO_SECRET_KEY` של Backend — **אין חובה** על `RESEND_*` ב-Backend.

### SMS OTP (אימות טלפון, בנוסף לאימייל)

```env
SMS_VERIFICATION_ENABLED=true
SMS_PROVIDER=log
```

- **`log`** — חינם: קוד OTP מודפס בלוגי Backend (פיתוח).
- **`twilio`** — ניסיון חינם ~$15, אחר כך בתשלום: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.

בדיקה: `GET /api/auth/sms-status/`

### Firebase Phone Auth (מומלץ — SMS דרך Firebase)

**שני שירותים — שניהם חובה:**

| שירות Railway | משתנים |
|---------------|--------|
| **Frontend** `mendeles-next` | כל `NEXT_PUBLIC_FIREBASE_*` (7 שורות) |
| **Backend** `eloquent-perfection` | `FIREBASE_SERVICE_ACCOUNT_JSON` + `PHONE_VERIFICATION_ENABLED=true` |

**Frontend** — Variables → הדבק מ-Firebase Console (Web app config):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=<מהקונסול>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mendeles-79320.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mendeles-79320
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mendeles-79320.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=798759282681
NEXT_PUBLIC_FIREBASE_APP_ID=1:798759282681:web:efccbaff3828e20e0ebf28
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-MQRMQHNNRR
```

**Backend** — Service account JSON (קובץ שלם בשורה אחת):

```env
PHONE_VERIFICATION_ENABLED=true
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"mendeles-79320",...}
```

איך להשיג `FIREBASE_SERVICE_ACCOUNT_JSON`:  
Firebase Console → ⚙️ Project settings → **Service accounts** → **Generate new private key** → העתק את תוכן ה-JSON.

Firebase Console → Authentication → **Phone** → Enable.  
Authorized domains: `localhost`, `mendeles-next-production.up.railway.app`.

**SMS לישראל (+972) — חובה:** Authentication → **Settings** → **SMS region policy** → **Allow** → הוסף **Israel (IL)**.  
ללא זה: `auth/operation-not-allowed` — "SMS unable to be sent until this region enabled".  
תוכנית **Blaze** (לא Spark בלבד) נדרשת ל-SMS ב-production — בלי Blaze: `auth/billing-not-enabled`.  
שדרוג: Firebase Console → ⚙️ **Usage and billing** → **Modify plan** → **Blaze**.

> **Redeploy** את **שני** השירותים אחרי שמירת המשתנים.

**בדיקות:**
- Frontend: `https://mendeles-next-production.up.railway.app/api/config/firebase` → `"configured": true`
- Backend: `https://eloquent-perfection-production-de3d.up.railway.app/api/auth/phone-verification-status/` → `firebase_ready: true`

זרימה: אימייל (Resend) → `/verify-phone` → Firebase SMS → `POST /api/auth/firebase/verify-phone/` (JWT חובה).

### iCount + הדפסה (Backend `eloquent-perfection` בלבד)

| משתנה | מה זה | חובה? |
|--------|--------|--------|
| `ICOUNT_API_TOKEN` | טוקן API מ-iCount → **הגדרות → API** (מתחיל ב-`API3E8-`) | **כן** |
| `ICOUNT_COMP_ID` | מזהה חברה (`cid`), למשל `mendeles` | מומלץ |
| `ICOUNT_USER` / `ICOUNT_PASSWORD` | התחברות ישנה (אימייל+סיסמה) — **לא** נדרש עם טוקן | לא |

```env
ICOUNT_API_TOKEN=API3E8-...your-token...
ICOUNT_COMP_ID=mendeles
ICOUNT_DOC_TYPE=auto
PRINT_SERVER_URL=https://battered-festivity-domelike.ngrok-free.app/print
PRINT_API_KEY=...your-key...
PRINT_API_KEY_HEADER=x-api-key
PRINT_PAYLOAD_MODE=forms
```

**הדפסה:** `requests.post(PRINT_SERVER_URL, headers={x-api-key:…}, json=…)` — ה-URL **כולל** `/print`.  
**`forms` (ברירת מחדל):** `id`, `name`, `phone`, `forms[]` → `tables[]` → `number`, `numbers`, `strong`.  
**`pdf_url`:** רק אם המדפסת מצפה ל-`{"pdf_url":"..."}` (אחרת השאר `forms`).

**HTTP 404:** לרוב **ngrok כבוי** (`endpoint … is offline`) — הפעל ngrok + מדפסת אצל אדם; אם URL השתנה, עדכן `PRINT_SERVER_URL` + Redeploy Backend.

> **אל תשים** את הטוקן ב-Git. רק ב-Railway Variables או `backend/.env` מקומי.  
> אחרי שמירה → **Redeploy Backend**. באדמין: סטטוס **iCount: מחובר** + לוג אינטגרציות.

אדמין → הזמנות → **הנפק חשבונית** | **הצג חשבונית** | **הדפס**.

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
