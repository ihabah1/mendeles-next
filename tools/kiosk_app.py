"""
kiosk_app.py — התחברות דוכן ל-Mandeles
========================================
מתחבר עם אימייל+סיסמה (מהאדמין → דוכנים) ומקבל apiKey לשימוש ב-x-api-key.

התקנה:
    pip install requests

הגדרות (kiosk_config.json ליד הקובץ):
    api_url  — https://mendeles-next-production.up.railway.app
    email    — אימייל הדוכן
    password — סיסמת הדוכן

הרצה:
    python tools/kiosk_app.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import requests

BASE_DIR = Path(__file__).parent
CONFIG_FILE = BASE_DIR / "kiosk_config.json"
VERSION = "1.0"


def load_config() -> dict:
    defaults = {
        "api_url": "https://mendeles-next-production.up.railway.app",
        "email": "",
        "password": "",
        "api_key": "",
    }
    try:
        data = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        return {**defaults, **data}
    except OSError:
        CONFIG_FILE.write_text(
            json.dumps(defaults, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        print(f"נוצר {CONFIG_FILE} — מלא email ו-password והרץ שוב.")
        sys.exit(1)


def save_config(cfg: dict) -> None:
    CONFIG_FILE.write_text(
        json.dumps(cfg, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def login(cfg: dict) -> str:
    base = cfg["api_url"].rstrip("/")
    email = (cfg.get("email") or "").strip()
    password = cfg.get("password") or ""

    if not email or not password:
        print("שגיאה: חסר email או password ב-kiosk_config.json")
        sys.exit(1)

    url = f"{base}/django-api/kiosk/login/"
    print(f"מתחבר ל-{url} …")

    # אל תשתמש ב-verify=False — זה גורם ל-InsecureRequestWarning ופגיע באבטחה.
    res = requests.post(
        url,
        json={"email": email, "password": password},
        headers={"Content-Type": "application/json"},
        timeout=30,
    )

    if res.status_code == 401:
        print("שגיאה: אימייל או סיסמה שגויים.")
        sys.exit(1)
    if res.status_code == 403:
        print("שגיאה: הדוכן מושבת — פנה למנהל.")
        sys.exit(1)
    if not res.ok:
        detail = res.json().get("detail") if res.headers.get("content-type", "").startswith("application/json") else res.text
        print(f"שגיאה {res.status_code}: {detail}")
        sys.exit(1)

    data = res.json()
    api_key = data.get("apiKey") or data.get("api_key") or ""
    if not api_key:
        print("שגיאה: השרת לא החזיר apiKey.")
        sys.exit(1)

    kiosk = data.get("kiosk") or {}
    print(f"התחברות הצליחה — דוכן: {kiosk.get('name', '?')}")
    print(f"apiKey: {api_key}")
    print("השתמש ב-header: x-api-key: <apiKey> לבקשות הדפסה.")

    cfg["api_key"] = api_key
    save_config(cfg)
    return api_key


def main() -> None:
    print(f"Mandeles Kiosk Login v{VERSION}")
    cfg = load_config()
    login(cfg)


if __name__ == "__main__":
    main()
