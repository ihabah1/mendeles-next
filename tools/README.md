# כלי סריקה — Mandeles

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
3. **scan_app** מושך הזמנות: `GET /api/print/orders/?status=printed`
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
