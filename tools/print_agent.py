"""
print_agent.py — סוכן הדפסה מקומי (Mandeles)
=============================================
מושך משימות מאושרות מהענן (24/7) ושולח לשרת המדפסת המקומי.
אין צורך ב-ngrok פתוח — הסוכן יוזם חיבור יוצא.

התקנה:
    pip install requests

הרצה:
    python tools/print_agent.py

הגדרות (print_agent_config.json ליד הקובץ):
    api_url      — כתובת האתר (Railway Frontend)
    api_key      — PRINT_API_KEY מ-Railway Backend
    local_print_url — שרת המדפסת המקומי (ברירת מחדל http://127.0.0.1:5000/print)
    poll_seconds — מרווח בין משיכות (ברירת מחדל 15)
    agent_id     — מזהה סוכן (ברירת מחדל default)
"""

from __future__ import annotations

import json
import socket
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

BASE_DIR = Path(__file__).parent
CONFIG_FILE = BASE_DIR / "print_agent_config.json"
VERSION = "1.1"


def load_config() -> dict:
    defaults = {
        "api_url": "https://mendeles-next-production.up.railway.app",
        "api_key": "",
        "local_print_url": "http://127.0.0.1:5000/print",
        "local_print_health_url": "",
        "poll_seconds": 15,
        "agent_id": "default",
    }
    try:
        data = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        return {**defaults, **data}
    except OSError:
        CONFIG_FILE.write_text(
            json.dumps(defaults, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        print(f"נוצר {CONFIG_FILE} — ערוך api_key ו-local_print_url והרץ שוב.")
        sys.exit(1)


def hostname() -> str:
    try:
        return socket.gethostname()
    except OSError:
        return "unknown"


class PrintAgent:
    def __init__(self, cfg: dict):
        self.base = cfg["api_url"].rstrip("/")
        self.headers = {
            "x-api-key": cfg["api_key"],
            "ngrok-skip-browser-warning": "true",
        }
        self.local_print_url = cfg["local_print_url"].rstrip("/")
        self.local_print_health_url = (cfg.get("local_print_health_url") or "").strip().rstrip("/")
        self.poll_seconds = max(5, int(cfg.get("poll_seconds") or 15))
        self.agent_id = (cfg.get("agent_id") or "default").strip()

    def check_printer_ready(self) -> tuple[bool, str]:
        """Ping local print server — reported to admin UI as printer status."""
        candidates = []
        if self.local_print_health_url:
            candidates.append(self.local_print_health_url)
        base = self.local_print_url.rsplit("/print", 1)[0] or self.local_print_url
        candidates.extend([f"{base}/health", f"{base}/status", base])

        seen: set[str] = set()
        for url in candidates:
            if not url or url in seen:
                continue
            seen.add(url)
            try:
                r = requests.get(url, timeout=3)
                if r.status_code < 500:
                    return True, f"מדפסת מקומית זמינה ({url})"
            except requests.RequestException:
                continue
        return False, "שרת המדפסת המקומי לא מגיב — ודא שהוא רץ"

    def heartbeat(self) -> None:
        ready, msg = self.check_printer_ready()
        requests.post(
            f"{self.base}/api/print/agent/heartbeat",
            headers=self.headers,
            json={
                "agentId": self.agent_id,
                "hostname": hostname(),
                "version": VERSION,
                "printerReady": ready,
                "printerMessage": msg,
            },
            timeout=10,
        ).raise_for_status()

    def pull_job(self) -> dict | None:
        r = requests.get(
            f"{self.base}/api/print/jobs/pull",
            headers=self.headers,
            params={"agentId": self.agent_id},
            timeout=15,
        )
        r.raise_for_status()
        job = r.json().get("job")
        return job if job else None

    def print_local(self, payload: dict) -> dict:
        r = requests.post(
            self.local_print_url,
            headers=self.headers,
            json=payload,
            timeout=60,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"מדפסת מקומית HTTP {r.status_code}: {r.text[:300]}")
        try:
            return r.json()
        except ValueError:
            return {"ok": True}

    def confirm(self, order_id: int) -> None:
        requests.post(
            f"{self.base}/api/print/confirm",
            headers=self.headers,
            json={"orderId": order_id, "printedAt": datetime.now().isoformat()},
            timeout=10,
        ).raise_for_status()

    def fail_job(self, job_id: int, error: str) -> None:
        requests.post(
            f"{self.base}/api/print/jobs/{job_id}/fail",
            headers=self.headers,
            json={"error": error[:500]},
            timeout=10,
        ).raise_for_status()

    def process_one(self) -> bool:
        job = self.pull_job()
        if not job:
            return False

        job_id = job["id"]
        order_id = job["orderId"]
        order_number = job.get("orderNumber", str(order_id))
        payload = job.get("payload") or {}

        print(f"[{datetime.now():%H:%M:%S}] מדפיס {order_number} (job #{job_id})...")
        try:
            result = self.print_local(payload)
            print(f"  מדפסת: {result}")
            self.confirm(order_id)
            print(f"  ✓ אושר באתר — {order_number}")
        except Exception as exc:
            print(f"  ✗ שגיאה: {exc}")
            try:
                self.fail_job(job_id, str(exc))
            except Exception as fail_exc:
                print(f"  ! לא ניתן לדווח כשל: {fail_exc}")
        return True

    def run(self) -> None:
        print(f"Mandeles Print Agent v{VERSION}")
        print(f"  API: {self.base}")
        print(f"  מדפסת: {self.local_print_url}")
        print(f"  סוכן: {self.agent_id} ({hostname()})")
        print("ממתין למשימות מאושרות... (Ctrl+C לעצירה)\n")

        while True:
            try:
                self.heartbeat()
                processed = self.process_one()
                if not processed:
                    time.sleep(self.poll_seconds)
                else:
                    time.sleep(2)
            except KeyboardInterrupt:
                print("\nנעצר.")
                break
            except requests.RequestException as exc:
                print(f"[{datetime.now():%H:%M:%S}] חיבור לענן נכשל: {exc}")
                time.sleep(self.poll_seconds)


if __name__ == "__main__":
    PrintAgent(load_config()).run()
