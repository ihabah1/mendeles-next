"""
לאחר הדפסה מוצלחת — עדכון סטטוס באתר Mandeles.

שרת המדפסת (או סקריפט מקומי) קורא ל-confirm_print_to_site אחרי שהטופס יצא מהמדפסת.
"""
from __future__ import annotations

from datetime import datetime, timezone

import requests


def confirm_print_to_site(
    order_id: int,
    order_number: str,
    *,
    site_base_url: str,
    api_key: str,
    printed_at: str | None = None,
) -> dict:
    """
    POST /api/print/confirm — מעדכן הזמנה ל-status ``printed``.

    site_base_url: כתובת Frontend (למשל https://mendeles-next-production.up.railway.app)
    api_key: אותו PRINT_API_KEY כמו ב-Railway Backend (header x-api-key)
    """
    base = site_base_url.rstrip("/")
    when = printed_at or datetime.now(timezone.utc).isoformat()
    res = requests.post(
        f"{base}/api/print/confirm",
        headers={
            "x-api-key": api_key.strip(),
            "ngrok-skip-browser-warning": "true",
        },
        json={
            "orderId": int(order_id),
            "orderNumber": order_number,
            "printedAt": when,
        },
        timeout=15,
    )
    if res.status_code == 401:
        raise RuntimeError(
            "401 — ה-API Key לא מתאים. ודא ש-PRINT_API_KEY ב-Railway Backend "
            "זהה בדיוק למפתח שבסקריפט (ללא רווחים)."
        )
    res.raise_for_status()
    try:
        return res.json()
    except ValueError:
        return {"ok": True, "raw": res.text[:200]}


if __name__ == "__main__":
    import os
    import sys

    if len(sys.argv) < 3:
        print("שימוש: python tools/print_confirm.py <order_id> <order_number>")
        print("משתני סביבה: SITE_URL, PRINT_API_KEY")
        sys.exit(1)

    oid = int(sys.argv[1])
    onum = sys.argv[2]
    site = os.environ.get("SITE_URL", "").strip()
    key = os.environ.get("PRINT_API_KEY", "").strip()
    if not site or not key:
        print("הגדר SITE_URL ו-PRINT_API_KEY")
        sys.exit(1)

    out = confirm_print_to_site(oid, onum, site_base_url=site, api_key=key)
    print("OK:", out)
