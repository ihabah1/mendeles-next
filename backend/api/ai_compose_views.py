"""Staff AI helpers — polish Hebrew message copy for customer inbox."""
import json
import re

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.staff_permissions import IsStaffPortalUser

IsStaffUser = IsStaffPortalUser

MAX_SUBJECT = 200
MAX_BODY = 4000

MODE_PROMPTS = {
    'polish': 'שפר את הניסוח בעברית — ברור, ידידותי ומקצועי. שמור על המשמעות.',
    'shorten': 'קצר את הטקסט בעברית תוך שמירה על המסר העיקרי.',
    'formal': 'הפוך את הטקסט לעברית פורמלית ומכובדת יותר.',
    'fix_grammar': 'תקן שגיאות כתיב, דקדוק ופיסוק בעברית. אל תשנה את המשמעות.',
    'subject': 'הצע נושא קצר ומתאים (עד 80 תווים) לגוף ההודעה.',
    'expand': 'הרחב מעט את הטקסט בעברית — הוסף פרטים שימושיים בלי להאריך יתר על המידה.',
}


def _local_text_fix(subject: str, body: str, mode: str, field: str) -> dict:
    """Minimal fallback when Gemini is unavailable."""
    out_subject = subject
    out_body = body
    if mode == 'shorten' and len(body) > 120:
        out_body = body[:117].rstrip() + '…'
    if mode == 'subject' and body.strip() and not subject.strip():
        first_line = body.strip().split('\n')[0][:80]
        out_subject = first_line
    return {
        'subject': out_subject[:MAX_SUBJECT],
        'body': out_body[:MAX_BODY],
        'source': 'local',
        'notice': 'Gemini לא זמין — בוצע שיפור בסיסי בלבד',
    }


def _parse_json_reply(raw: str) -> dict | None:
    text = (raw or '').strip()
    if not text:
        return None
    fence = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if fence:
        text = fence.group(1)
    else:
        start = text.find('{')
        end = text.rfind('}')
        if start >= 0 and end > start:
            text = text[start : end + 1]
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        return None
    return None


def _gemini_text_fix(subject: str, body: str, mode: str, field: str) -> dict | None:
    api_key = getattr(settings, 'GEMINI_API_KEY', '') or ''
    if not api_key.strip():
        return None
    try:
        import google.generativeai as genai
    except ImportError:
        return None

    mode_hint = MODE_PROMPTS.get(mode, MODE_PROMPTS['polish'])
    system = f"""אתה עורך מכתבי מערכת בעברית לאתר Mandeles (לוטו).
משימה: {mode_hint}
החזר JSON בלבד בפורמט: {{"subject": "...", "body": "..."}}
כללים:
- עברית תקנית וידידותית
- אל תוסיף markdown
- subject עד 80 תווים
- body עד 800 תווים
- אם field הוא subject בלבד — עדכן רק subject והחזר body כפי שניתן
- אם field הוא body בלבד — עדכן רק body והחזר subject כפי שניתן"""

    user_prompt = json.dumps(
        {'field': field, 'mode': mode, 'subject': subject, 'body': body},
        ensure_ascii=False,
    )

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            getattr(settings, 'GEMINI_MODEL', 'gemini-2.5-flash'),
            system_instruction=system,
        )
        result = model.generate_content(user_prompt)
        parsed = _parse_json_reply(result.text or '')
        if not parsed:
            return None
        out_subject = str(parsed.get('subject', subject) or subject).strip()[:MAX_SUBJECT]
        out_body = str(parsed.get('body', body) or body).strip()[:MAX_BODY]
        if field == 'subject':
            out_body = body
        elif field == 'body':
            out_subject = subject
        return {'subject': out_subject, 'body': out_body, 'source': 'gemini', 'notice': ''}
    except Exception:
        return None


@api_view(['POST'])
@permission_classes([IsStaffUser])
def ai_text_fix(request):
    """POST /api/admin/ai/text-fix/ — polish subject/body for customer messages."""
    subject = (request.data.get('subject') or '').strip()[:MAX_SUBJECT]
    body = (request.data.get('body') or '').strip()[:MAX_BODY]
    mode = (request.data.get('mode') or 'polish').strip()
    field = (request.data.get('field') or 'both').strip()

    if mode not in MODE_PROMPTS:
        return Response({'error': 'מצב AI לא תקין'}, status=status.HTTP_400_BAD_REQUEST)
    if field not in ('subject', 'body', 'both'):
        return Response({'error': 'שדה לא תקין'}, status=status.HTTP_400_BAD_REQUEST)
    if not subject and not body:
        return Response({'error': 'נושא או תוכן נדרשים'}, status=status.HTTP_400_BAD_REQUEST)
    if field == 'subject' and not body and mode != 'subject':
        return Response({'error': 'נדרש תוכן ליצירת נושא'}, status=status.HTTP_400_BAD_REQUEST)
    if field == 'body' and not body:
        return Response({'error': 'נדרש תוכן לשיפור'}, status=status.HTTP_400_BAD_REQUEST)

    ai = _gemini_text_fix(subject, body, mode, field)
    payload = ai or _local_text_fix(subject, body, mode, field)
    return Response(payload)
