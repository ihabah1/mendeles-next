"""Legacy Twilio WhatsApp agent — kept for backward compatibility."""

from __future__ import annotations

import json
import logging
import os
import urllib.parse
import urllib.request

from django.conf import settings
from django.http import HttpResponse

logger = logging.getLogger(__name__)


def whatsapp_agent_configured() -> bool:
    return bool(
        os.environ.get("WHATSAPP_AGENT_ENABLED", "").lower() == "true"
        and os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
        and os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
        and os.environ.get("TWILIO_WHATSAPP_FROM", "").strip()
    )


def twiml_response(message: str) -> HttpResponse:
    escaped = (
        message.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
    body = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{escaped}</Message></Response>'
    return HttpResponse(body, content_type="text/xml")


def generate_twilio_reply(incoming: str, profile_name: str = "") -> str:
    text = (incoming or "").strip()
    lower = text.lower()
    greeting = f"שלום{(' ' + profile_name) if profile_name else ''}! " if profile_name else "שלום! "

    if any(word in lower for word in ("hello", "hi", "hey", "שלום", "היי")):
        return (
            greeting
            + "אני הבוט של Mendeles. אפשר לשאול על הרשמה, אימות מייל, או ליצור קשר עם הצוות.\n"
            + "Hi! I'm the Mendeles bot. Ask about registration, email verification, or contact our team."
        )
    if any(word in lower for word in ("register", "signup", "הרשמה", "להירשם")):
        return f"להרשמה: {settings.FRONTEND_URL}/register"
    if any(word in lower for word in ("verify", "verification", "אימות", "מייל")):
        return f"לאימות מייל: {settings.FRONTEND_URL}/verify-email"
    if any(word in lower for word in ("contact", "support", "צור קשר", "תמיכה", "עזרה")):
        return f"צור קשר / Contact us: {settings.FRONTEND_URL}/#contact"

    return (
        greeting
        + "קיבלתי את ההודעה. נציג יחזור אליך בהקדם.\n"
        + "Message received. A team member will get back to you soon."
    )
