"""Django email backend using Resend HTTP API."""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)


class ResendEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        api_key = os.environ.get("RESEND_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("RESEND_API_KEY is not configured")

        from_email = (
            os.environ.get("RESEND_FROM_EMAIL", "").strip()
            or getattr(settings, "DEFAULT_FROM_EMAIL", "")
        )
        if not from_email:
            raise RuntimeError("RESEND_FROM_EMAIL or DEFAULT_FROM_EMAIL is not configured")

        sent = 0
        for message in email_messages:
            payload = {
                "from": from_email,
                "to": list(message.to),
                "subject": message.subject,
                "text": message.body,
            }
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
                logger.exception("resend_send_failed", extra={"status": exc.code, "body": body})
                if not self.fail_silently:
                    raise RuntimeError(f"Resend API error {exc.code}: {body}") from exc
            except Exception:
                logger.exception("resend_send_failed")
                if not self.fail_silently:
                    raise
        return sent
