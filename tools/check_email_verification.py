#!/usr/bin/env python3
"""Check email verification setup against a running API (local or production).

Usage:
  python tools/check_email_verification.py
  python tools/check_email_verification.py --base https://mendeles.com
  python tools/check_email_verification.py --base http://localhost:8000 --register
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
import uuid


def fetch_json(url: str, *, method: str = "GET", body: dict | None = None) -> tuple[int, object]:
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw else {"message": raw}
        except json.JSONDecodeError:
            payload = {"message": raw}
        return exc.code, payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify email auth endpoints")
    parser.add_argument("--base", default="https://mendeles.com", help="API base URL (no trailing slash)")
    parser.add_argument(
        "--register",
        action="store_true",
        help="Also run a test registration (creates a real user + sends email)",
    )
    args = parser.parse_args()
    base = args.base.rstrip("/")
    ok = True

    print(f"Checking {base} ...\n")

    status, health = fetch_json(f"{base}/api/v1/health/")
    print(f"[health] HTTP {status}")
    print(json.dumps(health, indent=2, ensure_ascii=False))
    if status != 200:
        ok = False

    status, email_status = fetch_json(f"{base}/api/v1/auth/email-status/")
    print(f"\n[email-status] HTTP {status}")
    if status == 404:
        print("  -> endpoint not found — deploy latest backend code first")
        ok = False
    elif isinstance(email_status, dict):
        print(json.dumps(email_status, indent=2, ensure_ascii=False))
        if not email_status.get("configured"):
            print("  -> Resend NOT configured — set RESEND_API_KEY + RESEND_FROM_EMAIL on Backend")
            ok = False
        else:
            print("  -> email sending configured OK")
    else:
        print(email_status)
        ok = False

    if args.register:
        email = f"verify-check-{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": email,
            "password": "SecurePass123!",
            "first_name": "Verify",
            "last_name": "Check",
            "tenant_name": f"Check {uuid.uuid4().hex[:6]}",
        }
        status, reg = fetch_json(f"{base}/api/v1/auth/register/", method="POST", body=payload)
        print(f"\n[register] HTTP {status} email={email}")
        print(json.dumps(reg, indent=2, ensure_ascii=False))
        if status != 201:
            ok = False
        elif isinstance(reg, dict) and reg.get("verification_email_sent") is False:
            print("  -> registration OK but verification email failed to send")
            ok = False
        else:
            print("  -> registration + verification email OK (check inbox)")

    print("\n" + ("PASS" if ok else "FAIL"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
