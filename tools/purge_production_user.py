#!/usr/bin/env python3
"""Purge a user from production by email (requires platform admin login).

Usage:
  python tools/purge_production_user.py ihab.ah1@gmail.com
  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret python tools/purge_production_user.py ihab.ah1@gmail.com
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


def api(base: str, path: str, *, method: str = "GET", body: dict | None = None, token: str | None = None):
    url = f"{base.rstrip('/')}{path}"
    headers = {"Accept": "application/json"}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
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
    parser = argparse.ArgumentParser(description="Purge user by email on production")
    parser.add_argument("email", help="Email to purge")
    parser.add_argument("--base", default=os.environ.get("API_BASE", "https://mendeles.com"))
    parser.add_argument("--purge-tenant", action="store_true", default=True)
    parser.add_argument("--no-purge-tenant", action="store_false", dest="purge_tenant")
    parser.add_argument("--unverified-only", action="store_true", default=False)
    args = parser.parse_args()

    email = args.email.strip().lower()
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip()
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    if not admin_email or not admin_password:
        print("Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.")
        return 1

    print(f"Base: {args.base}")
    print(f"Login as: {admin_email}")

    status, login = api(
        args.base,
        "/api/v1/auth/login/",
        method="POST",
        body={"email": admin_email, "password": admin_password},
    )
    if status != 200 or not isinstance(login, dict) or "access" not in login:
        print(f"Login failed HTTP {status}: {login}")
        return 1

    token = login["access"]
    perms = (login.get("user") or {}).get("permissions") or []
    if "tenants.view" not in perms:
        print("User lacks tenants.view — cannot purge. Use a platform admin account.")
        return 1

    status, lookup = api(
        args.base,
        f"/api/v1/users/blocked-registrations/?email={urllib.parse.quote(email)}",
        token=token,
    )
    print(f"\nLookup HTTP {status}: {json.dumps(lookup, ensure_ascii=False, indent=2)}")

    status, purge = api(
        args.base,
        "/api/v1/users/purge/",
        method="POST",
        token=token,
        body={
            "emails": [email],
            "purge_tenant": args.purge_tenant,
            "unverified_only": args.unverified_only,
        },
    )
    print(f"\nPurge HTTP {status}: {json.dumps(purge, ensure_ascii=False, indent=2)}")
    if status != 200:
        return 1

    results = (purge or {}).get("results") or []
    if not results:
        print("No results returned")
        return 1

    result = results[0]
    if result.get("status") == "purged":
        print(f"\nSUCCESS: {email} purged")
        return 0
    if result.get("status") == "not_found":
        print(f"\nNOT FOUND: {email} (already deleted or never registered)")
        return 0
    print(f"\nFAILED: {result.get('status')}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
