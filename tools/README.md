# כלי הדפסה וסריקה — Mandeles

## kiosk_app.py

התחברות דוכן — אימייל+סיסמה (מאדמין → דוכנים) → `apiKey` ל-header `x-api-key`.

```bash
pip install requests
python tools/kiosk_app.py
```

קובץ הגדרות: `kiosk_config.json` — `api_url`, `email`, `password`.  
אחרי התחברות מוצלחת נשמר `api_key` בקובץ.

> **אזהרת InsecureRequestWarning** — מופיעה אם בקוד יש `verify=False`. הסר את זה; השתמש ב-HTTPS רגיל.

---

## print_agent.py

סוכן הדפסה מקומי — מושך משימות **מאושרות** מהענן (24/7) ושולח לשרת המדפסת על המחשב.

### זרימה

1. לקוח שולח טופס → נכנס אוטומטית ל**תור הדפסה** (`queued`)
2. צוות מאשר ב-`/admin/print-queue` → `approved`
3. **print_agent** מושך: `GET /api/print/jobs/pull` (x-api-key)
4. שולח ל-`local_print_url` (מדפסת מקומית)
5. מאשר: `POST /api/print/confirm` → `printed`

### הרצה

```bash
pip install requests
python tools/print_agent.py
```

קובץ הגדרות: `print_agent_config.json` (נוצר אוטומטית בפעם הראשונה).

---

## scan_app.py

אפליקציית Windows לסריקת טפסי לוטו אחרי הדפסה.

### זרימה

1. **אדמין** לוחץ «הדפס» → ההזמנה נשלחת לשרת המדפסת (סטטוס **בדפוס**)
2. **אחרי הדפסה מוצלחת** — שרת המדפסת קורא:

   ```python
   from tools.print_confirm import confirm_print_to_site

   confirm_print_to_site(order_id, order_number, site_base_url=SITE_URL, api_key=PRINT_API_KEY)
   ```

   או ידנית: `POST {SITE}/api/print/confirm` עם header `x-api-key` וגוף `{ orderId, printedAt }` → סטטוס **הודפס**

   CLI: `SITE_URL=... PRINT_API_KEY=... python tools/print_confirm.py 123 MAND-001`
3. **scan_app** מושך הזמנות: `GET /api/print/orders/?status=awaiting_scan`
4. מפעיל סורק / בוחר PDF → `POST /api/print/scan/`
5. סטטוס הופך ל-**הושלם** — הלקוח רואה «צפה בסריקה» בפרופיל

### התקנה

```bash
pip install requests pillow
```

### הגדרה

בפעם הראשונה שמירת הגדרות יוצרת `scan_config.json`:

```json
{
  "api_url": "https://mendeles-next-production.up.railway.app",
  "api_key": "<PRINT_API_KEY מ-Railway Backend>"
}
```

### הרצה

```bash
python tools/scan_app.py
```
