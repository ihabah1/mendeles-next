"""Django email backend using Resend HTTP API."""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

from identity.infrastructure.email_config import normalize_from_email, resolve_from_email

logger = logging.getLogger(__name__)


class ResendEmailBackend(BaseEmailBackend):
    def _resolve_from(self, message) -> str:
        raw = (message.from_email or "").strip() or resolve_from_email()
        return normalize_from_email(raw)

    def send_messages(self, email_messages):
        api_key = os.environ.get("RESEND_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("RESEND_API_KEY is not configured")

        sent = 0
        for message in email_messages:
            from_email = self._resolve_from(message)
            payload = {
                "from": from_email,
                "to": list(message.to),
                "subject": message.subject,
                "text": message.body,
            }
            for content, mimetype in getattr(message, "alternatives", []):
                if mimetype == "text/html":
                    payload["html"] = content
                    break
            if message.cc:
                payload["cc"] = list(message.cc)
            if message.bcc:
                payload["bcc"] = list(message.bcc)
            if message.reply_to:
                payload["reply_to"] = list(message.reply_to)

            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "mendeles-backend/1.0",
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    if resp.status >= 400:
                        body = resp.read().decode("utf-8", errors="replace")
                        raise RuntimeError(f"Resend API error {resp.status}: {body}")
                sent += 1
            except urllib.error.HTTPError as exc:
                body = exc.read().decode("utf-8", errors="replace")
                logger.exception("resend_send_failed", extra={"status": exc.code, "body": body, "from": from_email})
                if not self.fail_silently:
                    raise RuntimeError(f"Resend API error {exc.code}: {body}") from exc
            except Exception:
                logger.exception("resend_send_failed", extra={"from": from_email})
                if not self.fail_silently:
                    raise
        return sent
