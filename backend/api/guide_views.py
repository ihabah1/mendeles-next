"""Public site guide chat — navigation help in Hebrew."""
import re

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from api.services.guide_chat_store import append_guide_message
from api.services.support_chat import notify_staff_chat_request, wants_human_agent

SITE_MAP = """
דפים באתר Mandeles.co.il:
- / דף ראשי
- /lotto מילוי והגשת טפסי לוטו (דורש התחברות ויתרה)
- /seven77 משחק 777
- /toto טוטו (אם פעיל)
- /auth כניסה והרשמה
- /auth/verify-email אימות אימייל
- /profile פרופיל משתמש
- /profile/topup טעינת ארנק
- /profile/orders היסטוריית הזמנות
- /profile/details פרטים אישיים
- /profile/password שינוי סיסמה
- /about אודות
- /terms תנאי שימוש
- /accessibility נגישות
- /admin ניהול לצוות (הזמנות, הדפסה, הרשאות, יתרות)
"""

LOCAL_TOPICS = [
    (["לוטו", "טופס", "טפסים", "הגרלה"], "בדף הלוטו בוחרים מספרים ושולחים להגשה.", [("/lotto", "דף לוטו")]),
    (["777", "שבע"], "משחק 777 בנתיב /seven77.", [("/seven77", "דף 777")]),
    (["טוטו"], "טוטו ב-/toto.", [("/toto", "דף טוטו")]),
    (["הרשמה", "התחבר", "כניסה", "חשבון"], "כניסה והרשמה ב-/auth.", [("/auth", "כניסה / הרשמה")]),
    (["פרופיל", "פרטים", "סיסמה"], "הפרופיל ב-/profile.", [("/profile", "פרופיל")]),
    (["ארנק", "יתרה", "טעינה", "כסף"], "טעינת ארנק ב-/profile/topup.", [("/profile/topup", "טעינת ארנק")]),
    (["הזמנ", "רכיש", "היסטור"], "היסטוריה ב-/profile/orders.", [("/profile/orders", "היסטוריה")]),
    (["בית", "ראשי"], "דף הבית /.", [("/", "דף ראשי")]),
    (["ניהול", "אדמין", "admin"], "ניהול לצוות ב-/admin.", [("/admin", "דשבורד ניהול")]),
]


def _local_reply(message: str) -> dict:
    q = (message or "").strip().lower()
    if not q:
        return {
            "text": "כתבו שאלה — למשל «איפה הלוטו?» או «איך טוענים יתרה?»",
            "links": [{"href": "/lotto", "label": "לוטו"}, {"href": "/profile", "label": "פרופיל"}],
            "source": "local",
        }

    best_score = 0
    best = None
    for keywords, text, links in LOCAL_TOPICS:
        score = sum(len(k) for k in keywords if k in q)
        if score > best_score:
            best_score = score
            best = (text, links)

    if best and best_score > 0:
        text, links = best
        return {
            "text": text,
            "links": [{"href": h, "label": l} for h, l in links],
            "source": "local",
        }

    return {
        "text": "נסו לשאול על: לוטו, פרופיל, ארנק, הרשמה או ניהול.",
        "links": [
            {"href": "/lotto", "label": "לוטו"},
            {"href": "/profile", "label": "פרופיל"},
            {"href": "/auth", "label": "כניסה"},
        ],
        "source": "local",
    }


def _extract_links(text: str) -> list[dict]:
    links = []
    for m in re.finditer(r"\[([^\]]+)\]\((/[^)]+)\)", text):
        links.append({"href": m.group(2), "label": m.group(1)})
    return links


def _gemini_reply(message: str) -> dict | None:
    api_key = getattr(settings, "GEMINI_API_KEY", "") or ""
    if not api_key.strip():
        return None
    try:
        import google.generativeai as genai
    except ImportError:
        return None

    system = f"""אתה נציג דיגיטלי ידידותי באתר Mandeles.co.il. ענה בעברית, קצר (2-4 משפטים).
עזור בניווט, לוטו, ארנק והרשמה. הצע קישורים בפורמט [תווית](/path) כשמתאים.
{SITE_MAP}
אם הלקוח מבקש נציג אנושי, תמיכה אישית או עזרה שלא יכולה להיפתר בניווט — אמר שפנית לצוות ויחזרו אליו.
אל תמציא דפים שלא ברשימה."""

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            getattr(settings, "GEMINI_MODEL", "gemini-2.5-flash"),
            system_instruction=system,
        )
        result = model.generate_content(message.strip())
        text = (result.text or "").strip()
        if not text:
            return None
        links = _extract_links(text)
        clean = re.sub(r"\[([^\]]+)\]\((/[^)]+)\)", r"\1", text)
        return {"text": clean.strip(), "links": links, "source": "gemini"}
    except Exception:
        return None


def _client_ip(request) -> str | None:
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


@api_view(["POST"])
@permission_classes([AllowAny])
def guide_chat(request):
    """POST /api/guide/chat/ { message, history?, page_path? } -> site help."""
    message = (request.data.get("message") or "").strip()
    if len(message) > 500:
        return Response({"error": "הודעה ארוכה מדי"}, status=status.HTTP_400_BAD_REQUEST)
    if not message:
        return Response({
            "text": "איך ניתן לעזור?",
            "links": [],
            "source": "local",
            "escalated": False,
        })

    history = request.data.get("history") or []
    if not isinstance(history, list):
        history = []
    page_path = (request.data.get("page_path") or "").strip()[:200]
    already_escalated = bool(request.data.get("already_escalated"))

    ai = _gemini_reply(message)
    payload = ai or _local_reply(message)

    escalated = False
    if wants_human_agent(message) and not already_escalated:
        escalated = notify_staff_chat_request(
            user=request.user,
            message=message,
            history=history,
            guest_name=(request.data.get("guest_name") or "").strip()[:80],
            page_path=page_path,
            ip_address=_client_ip(request),
        )
        if escalated:
            payload["text"] = (
                f"{payload.get('text', '').strip()}\n\n"
                "✅ העברנו את הבקשה לצוות האתר. נציג יחזור אליך בהקדם האפשרי."
            ).strip()

    session_id = (request.data.get("session_id") or "").strip()[:64]
    append_guide_message(
        session_id=session_id,
        user=request.user,
        guest_name=(request.data.get("guest_name") or "").strip()[:80],
        page_path=page_path,
        ip_address=_client_ip(request),
        user_message=message,
        assistant_message=payload.get("text", ""),
        escalated=escalated,
    )

    payload["escalated"] = escalated
    return Response(payload)
