"""Twilio WhatsApp agent webhook and helpers."""

import logging
import os
import urllib.parse
import urllib.request

from django.conf import settings
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


def _whatsapp_configured() -> bool:
    return bool(
        os.environ.get("WHATSAPP_AGENT_ENABLED", "").lower() == "true"
        and os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
        and os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
        and os.environ.get("TWILIO_WHATSAPP_FROM", "").strip()
    )


def _twiml(message: str) -> HttpResponse:
    escaped = (
        message.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
    body = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{escaped}</Message></Response>'
    return HttpResponse(body, content_type="text/xml")


def _generate_reply(incoming: str, profile_name: str = "") -> str:
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

    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if gemini_key and len(text) > 2:
        try:
            import json

            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": (
                                    "You are a helpful bilingual (Hebrew/English) support bot for Mendeles, "
                                    "a business SEO platform. Reply briefly in the user's language.\n\n"
                                    f"User message: {text}"
                                )
                            }
                        ]
                    }
                ]
            }
            model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite")
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
                f"?key={urllib.parse.quote(gemini_key)}"
            )
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates") or []
            if candidates:
                parts = candidates[0].get("content", {}).get("parts") or []
                if parts and parts[0].get("text"):
                    return parts[0]["text"].strip()[:1000]
        except Exception:
            logger.exception("whatsapp_gemini_failed")

    return (
        greeting
        + "קיבלתי את ההודעה. נציג יחזור אליך בהקדם.\n"
        + "Message received. A team member will get back to you soon."
    )


@method_decorator(csrf_exempt, name="dispatch")
class WhatsAppWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        if not _whatsapp_configured():
            return _twiml("WhatsApp agent is not configured.")

        body = request.POST.get("Body", "")
        profile = request.POST.get("ProfileName", "")
        from_number = request.POST.get("From", "")
        logger.info("whatsapp_inbound", extra={"from": from_number, "body": body[:200]})
        reply = _generate_reply(body, profile)
        return _twiml(reply)

    def get(self, request):
        return Response({"message": "WhatsApp webhook ready"})


class WhatsAppStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "enabled": os.environ.get("WHATSAPP_AGENT_ENABLED", "").lower() == "true",
                "configured": _whatsapp_configured(),
                "from": os.environ.get("TWILIO_WHATSAPP_FROM", ""),
            }
        )


class WhatsAppSimulateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        body = (request.data.get("body") or request.data.get("message") or "").strip()
        if not body:
            return Response(
                {"error": {"code": "validation_error", "message": "נדרש body", "details": {}}},
                status=400,
            )
        reply = _generate_reply(body, request.user.first_name)
        return Response({"reply": reply})
