"""
kiosk_api_client.py — לקוח API לתוכנת דוכן (kiosk_app.py)
העתק לתיקיית servers/ ליד kiosk_app.py והחלף את class KioskAPI + _login.
"""
from __future__ import annotations

import requests


def django_api_base(site_url: str) -> str:
    base = (site_url or "").rstrip("/")
    if base.endswith("/django-api"):
        return base
    return f"{base}/django-api"


def kiosk_login(site_url: str, email: str, password: str) -> dict:
    """POST /django-api/kiosk/login/ → { apiKey, kiosk }"""
    r = requests.post(
        f"{django_api_base(site_url)}/kiosk/login/",
        json={"email": email.strip(), "password": password},
        headers={"Content-Type": "application/json"},
        timeout=30,
    )
    if not r.ok:
        body = {}
        if r.headers.get("content-type", "").startswith("application/json"):
            try:
                body = r.json()
            except ValueError:
                pass
        raise RuntimeError(body.get("detail") or body.get("error") or f"שגיאת חיבור ({r.status_code})")
    return r.json()


class KioskAPI:
    def __init__(self, site_url: str, api_key: str):
        self.base = django_api_base(site_url)
        self.key = (api_key or "").strip()

    def _headers(self) -> dict[str, str]:
        return {
            "x-api-key": self.key,
            "x-kiosk-key": self.key,
            "Content-Type": "application/json",
        }

    def get_jobs(self, status: str = "pending") -> list:
        r = requests.get(
            f"{self.base}/kiosk/jobs/",
            params={"status": status},
            headers=self._headers(),
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        if isinstance(data, list):
            return data
        return data.get("jobs", [])

    def get_dashboard(self) -> dict:
        r = requests.get(
            f"{self.base}/kiosk/dashboard/",
            headers=self._headers(),
            timeout=30,
        )
        r.raise_for_status()
        return r.json()

    def complete_job(self, job_id: int, scan_pdf_b64: str, scan_invoice_b64: str = "") -> dict:
        payload: dict = {"jobId": job_id, "scanPdf": scan_pdf_b64}
        if scan_invoice_b64:
            payload["scanInvoice"] = scan_invoice_b64
        r = requests.post(
            f"{self.base}/kiosk/complete/",
            json=payload,
            headers=self._headers(),
            timeout=60,
        )
        r.raise_for_status()
        return r.json()
