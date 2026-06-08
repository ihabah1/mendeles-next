# כלי סריקה — Mandeles

## scan_app.py

אפליקציית Windows לסריקת טפסי לוטו אחרי הדפסה.

### זרימה

1. **אדמין** לוחץ «הדפס» → ההזמנה נשלחת לשרת המדפסת
2. **שרת המדפסת** מעדכן את האתר: `POST /api/print/confirm/` → סטטוס **הודפס**
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
