# צ'קליסט Phase 3 + 4 — Landing Page Engine & Lead Generation

מסמכי ארכיטקטורה:
- [landing-page-engine.md](./architecture/landing-page-engine.md)
- [lead-generation-engine.md](./architecture/lead-generation-engine.md)

> **סטטוס:** Phase 4 מומש. Phase 3 ממתין לאישור ארכיטקטורה לפני מימוש.

---

## 0. אישור ארכיטקטורה (חובה לפני קוד)

- [ ] אישור מיפוי DB ל-Phase 2.5 (ללא טבלאות כפולות)
- [ ] URL prefix: `/pages/{slug}` (או שורש מותאם — להחליט)
- [ ] `in_review` חובה לפני פרסום? (כן / לא)
- [ ] FormSubmission ב-Phase 3 או רק Lead ב-Phase 4? (מומלץ: Phase 4 בלבד)
- [ ] התראת email על ליד חדש ב-Phase 4? (כן / hooks בלבד)
- [ ] אישור רשימת 14 הבלוקים
- [ ] אישור הרשאות `leads.*` החדשות

---

## Phase 3 — Landing Page Engine

### Backend

- [ ] API facade: `/api/v1/landing-pages/`
- [ ] CRUD דפי נחיתה (`page_type=landing_page`)
- [ ] בלוקים: create, update, delete, hide, duplicate, reorder
- [ ] שדה `featured_image_id` על `content.Page`
- [ ] הרחבת `BlockType`: `benefits`, `whatsapp`, `map`, `video`, `divider`, `spacer`
- [ ] סכמות JSON (Pydantic) לכל סוג בלוק
- [ ] Public API: `GET /api/v1/public/pages/by-path/`
- [ ] טבלת `PageAnalyticsEvent` + `POST /api/v1/public/analytics/`
- [ ] מימוש `SchemaService.webpage()` ו-`SchemaService.faq()`
- [ ] `POST /pages/{id}/restore-version/{n}/`
- [ ] מיגרציות + בדיקות יחידה

### Frontend — עורך (ללא drag & drop)

- [ ] `/dashboard/landing-pages` — רשימת דפים
- [ ] `/dashboard/landing-pages/[id]/edit` — עורך בלוקים
- [ ] רשימת בלוקים: Move Up, Move Down, Duplicate, Hide, Delete
- [ ] פאנל הגדרות: title, slug, status, template, featured image
- [ ] טאב SEO: meta title/description + validate
- [ ] Preview: Desktop (1280px), Tablet (768px), Mobile (375px)
- [ ] קישור בניווט הדשבורד (הרשאת `content.view`)

### Frontend — רינדור ציבורי

- [ ] Route: `/[locale]/pages/[...slug]`
- [ ] `LandingPageRenderer` + Block Registry
- [ ] `generateMetadata()` דרך מנוע SEO הקיים
- [ ] JSON-LD: WebPage, FAQ (אם קיים), BreadcrumbList
- [ ] Analytics client: `page_view`, `cta_click`, `whatsapp_click`
- [ ] Revalidate על publish

### בלוקים (v1)

- [ ] Hero
- [ ] Rich Text
- [ ] CTA
- [ ] Features
- [ ] Benefits
- [ ] FAQ
- [ ] Testimonials
- [ ] Gallery
- [ ] Contact Form
- [ ] WhatsApp Button
- [ ] Google Map
- [ ] Video
- [ ] Divider
- [ ] Spacer

### איכות Phase 3

- [ ] API tests: publish, reorder, duplicate, public 404 לטיוטה
- [ ] E2E: יצירת דף → הוספת hero → פרסום → URL ציבורי 200
- [ ] axe על דף נחיתת דמו (0 serious/critical)
- [ ] Lighthouse accessibility ≥ 90 על דף נחיתה
- [ ] `npm run build` עובר

---

## Phase 4 — Lead Generation Engine

### Backend

- [x] אפליקציה `backend/leads/`
- [x] מודול טפסים בתוך `leads` (`FormDefinition`, `FormSubmission`)
- [x] מודלים: Lead, LeadSource, LeadUTM, LeadNote, LeadActivity, LeadAssignment
- [x] FormDefinition + FormSubmission (audit)
- [x] סטטוסים: new, contacted, qualified, unqualified, converted, closed, archived
- [x] `POST /api/v1/leads/public/submit/` (rate limit + honeypot)
- [x] API דשבורד: list, detail, patch, delete, notes, search, export CSV
- [x] הרשאות RBAC: `leads.view`, `leads.edit`, `leads.delete`, `leads.export`, `leads.manage`
- [x] `permission_registry` מעודכן
- [x] Analytics hooks: lead_created, lead_updated, lead_converted, form_submitted
- [x] בידוד tenant בכל שאילתה
- [x] מיגרציות + בדיקות יחידה

### Frontend

- [x] `/dashboard/leads` — רשימה
- [x] פילטרים: status, source
- [x] חיפוש: name, phone, email, message
- [x] מיון + pagination (25 לעמוד)
- [x] `/dashboard/leads/[id]` — פרטים, UTM, ציר זמן, הערות
- [x] שינוי סטטוס ידני
- [x] ייצוא CSV (הרשאת `leads.export`)
- [x] קומפוננטת `LeadCaptureForm` מוכנה לחיבור לבלוק `contact_form`
- [x] קישור בניווט הדשבורד (הרשאת `leads.view`)

### איכות Phase 4

- [x] ולידציה: שדות חובה per-form schema
- [x] E2E: דשבורד לידים נטען למנהל
- [x] axe על דפי leads בדשבורד
- [x] `npm run build` עובר

### מרכז שליטה

- [x] נראות כניסות (7 ימים + רשימה אחרונה)
- [x] נראות עמודי נחיתה (סיכום + רשימה אחרונה)

---

## לפני פרודקשן (שני השלבים)

- [ ] מיגרציות על staging
- [ ] `seed_rbac` עם הרשאות leads
- [ ] cron `publish_scheduled_pages` פעיל
- [ ] דפי נחיתה שפורסמו מופיעים ב-sitemap
- [ ] בדיקת נגישות ([accessibility-checklist.md](./accessibility-checklist.md))
- [ ] תיעוד API מעודכן (`docs/architecture/api-v1.md`)
- [ ] משתני env לפרודקשן מוגדרים

---

## מה לא כלול (אסור במימוש)

- [ ] ~~AI~~
- [ ] ~~Lead Routing אוטומטי~~
- [ ] ~~CRM~~
- [ ] ~~Payments~~
- [ ] ~~Keyword Research~~
- [ ] ~~Affiliate integrations~~
- [ ] ~~Drag & drop בעורך~~
- [ ] ~~דשבורד analytics~~

---

*נוצר לפי ארכיטקטורת Phase 3+4 — commit `6303b76`.*
