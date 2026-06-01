# Mandeles Next.js — מדריך מלא

## סטאק
- **Next.js 14** App Router + TypeScript
- **PostgreSQL** (Neon חינמי / Railway)
- **Prisma** ORM
- **Stripe** תשלומים
- **Twilio** SMS OTP + עדכונים
- **Railway** hosting

---

## הרצה מקומית

### 1. התקן
```bash
npm install
```

### 2. הגדר .env
```bash
cp .env.example .env
# ערוך .env עם הפרטים שלך
```

### 3. DB — Neon (חינמי)
1. neon.tech → Create Project
2. העתק `DATABASE_URL` ל-.env
3. הרץ:
```bash
npx prisma generate
npx prisma db push
```

### 4. הרץ
```bash
npm run dev
# http://localhost:3000
```

---

## מיגרציה מהפרויקט הישן

### שלב 1 — ייצא נתונים
```bash
# בתיקיית הפרויקט הישן (Python)
python scripts/export_sqlite.py
```

### שלב 2 — ייבא ל-PostgreSQL
```bash
psql $DATABASE_URL < data/import_all.sql
```

---

## פריסה ל-Railway

### 1. Push ל-GitHub
```bash
git init && git add . && git commit -m "Mandeles Next.js"
gh repo create mandeles-next --private --push
```

### 2. Railway
1. railway.app → New Project → Deploy from GitHub
2. בחר את ה-repo
3. הוסף **PostgreSQL** service
4. ב-Variables הוסף את כל ה-.env vars
5. Deploy אוטומטי

### 3. Custom Domain
Railway → Settings → Domains → `mandeles.co.il`

---

## מבנה הפרויקט

```
app/
├── (site)/
│   ├── page.tsx           דף הבית
│   ├── auth/              כניסה + הרשמה + Google + Apple + שכחתי
│   ├── reset-password/    איפוס סיסמה
│   ├── lotto/             טופס 14 טבלאות
│   ├── toto/              ניתוח טוטו
│   ├── profile/           פרופיל + הזמנות + ארנק
│   ├── topup/             טעינת ארנק
│   ├── admin/             דשבורד + הזמנות + בדיקת זכיות
│   ├── about/             אודות
│   ├── terms/             תנאי שימוש
│   └── accessibility/     נגישות
├── api/
│   ├── auth/
│   │   ├── login/         POST — email + password
│   │   ├── register/      POST — phone + OTP
│   │   ├── otp/           POST — send/verify
│   │   ├── me/            GET — פרטי משתמש
│   │   ├── logout/        POST
│   │   ├── google/        GET — OAuth redirect
│   │   ├── google/callback/ GET — OAuth callback
│   │   ├── apple/         GET — Sign In redirect
│   │   ├── apple/callback/ POST — Sign In callback
│   │   ├── forgot-password/ POST
│   │   └── reset-password/  POST
│   ├── lotto/
│   │   ├── my-sets/       GET — 200 הסטים
│   │   ├── subscribe/     POST — רכישת מנוי
│   │   ├── submit/        POST — שליחת טבלאות
│   │   └── orders/        GET — היסטוריית הזמנות
│   ├── wallet/
│   │   ├── balance/       GET
│   │   ├── history/       GET
│   │   └── topup/         POST — Stripe PaymentIntent
│   ├── admin/
│   │   ├── stats/         GET — סטטיסטיקות
│   │   ├── orders/        GET/PATCH — הזמנות
│   │   ├── users/         GET — משתמשים
│   │   ├── notify/        POST — עדכון סטטוס + SMS
│   │   └── check-wins/    POST — בדיקת זכיות
│   ├── toto/
│   │   ├── route.ts       GET — fixtures + ניתוח
│   │   └── stream/        GET — SSE
│   ├── stats/             GET — סטטיסטיקות ציבוריות
│   └── webhooks/stripe/   POST — Stripe webhook
├── globals.css
└── layout.tsx             Footer עם links
components/
├── Nav.tsx                ניווט responsive
├── ErrorBoundary.tsx      טיפול בשגיאות
└── Toast.tsx              הודעות
lib/
├── prisma.ts              DB client
├── auth.ts                JWT helpers
├── lotto.ts               אלגוריתם מנדל
└── sms.ts                 Twilio
middleware.ts              הגנה על routes
prisma/schema.prisma       DB schema מלא
scripts/export_sqlite.py   מיגרציה מ-SQLite
```

---

## Environment Variables

| Variable | דוגמה | הכרחי |
|---|---|---|
| DATABASE_URL | postgresql://... | ✅ |
| JWT_SECRET | random-64-chars | ✅ |
| ADMIN_TOKEN | your-admin-token | ✅ |
| STRIPE_SECRET_KEY | sk_live_... | ✅ |
| STRIPE_WEBHOOK_SECRET | whsec_... | ✅ |
| TWILIO_ACCOUNT_SID | ACxxx | SMS |
| TWILIO_AUTH_TOKEN | xxx | SMS |
| TWILIO_VERIFY_SID | VAxxx | OTP |
| TWILIO_FROM_NUMBER | +1xxx | SMS |
| GOOGLE_CLIENT_ID | xxx.apps.googleusercontent.com | Google |
| GOOGLE_CLIENT_SECRET | xxx | Google |
| APPLE_CLIENT_ID | com.mandeles.web | Apple |
| APPLE_TEAM_ID | xxx | Apple |
| APPLE_KEY_ID | xxx | Apple |
| APPLE_PRIVATE_KEY | -----BEGIN... | Apple |
| SMTP_HOST | smtp.gmail.com | Email |
| SMTP_USER | xxx@gmail.com | Email |
| SMTP_PASS | app-password | Email |
| FROM_EMAIL | noreply@mandeles.co.il | Email |
| NEXT_PUBLIC_SITE_URL | https://mandeles.co.il | ✅ |
| API_FOOTBALL_KEY | DEMO / real-key | טוטו |
| TABLE_PRICE_ILS | 2.5 | ✅ |
| COMMISSION_ILS | 5.0 | ✅ |
