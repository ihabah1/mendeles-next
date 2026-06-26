"""AI-powered document generation from a free-text topic."""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from django.conf import settings

from admin_panel.portal.models import BusinessProfile, DocumentTemplate

logger = logging.getLogger(__name__)

MAX_TOPIC = 2000


class GuestBusinessContext:
    """Minimal business context for unauthenticated document generation."""

    def __init__(self, *, business_name: str = '', logo_data: str = '', trade: str = 'general'):
        self.business_name = business_name or 'העסק שלי'
        self.trade = trade
        self.logo_data = logo_data
        self.logo_url = ''


def guest_business_context(*, business_name: str = '', logo_data: str = '', trade: str = 'general') -> GuestBusinessContext:
    return GuestBusinessContext(
        business_name=(business_name or '').strip() or 'העסק שלי',
        logo_data=logo_data or '',
        trade=trade or 'general',
    )


def _trade_label(profile) -> str:
    trade = getattr(profile, 'trade', 'general')
    try:
        return dict(BusinessProfile.Trade.choices).get(trade, trade)
    except Exception:
        return str(trade)


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


def _safe_gemini_text(result) -> str:
    try:
        text = getattr(result, 'text', None)
        if text:
            return str(text).strip()
    except (ValueError, AttributeError):
        pass
    try:
        parts = result.candidates[0].content.parts
        return ''.join(getattr(p, 'text', '') for p in parts).strip()
    except (IndexError, AttributeError, TypeError, KeyError):
        return ''


def _pick_template(topic: str) -> DocumentTemplate | None:
    t = topic.lower()
    if any(w in t for w in ('שיחה', 'טלפון', 'פגישה', 'זום')):
        slug = 'call-summary'
    elif any(w in t for w in ('ביקור', 'ביקרתי', 'אצל הלקוח', 'בבית')):
        slug = 'visit-summary'
    else:
        slug = 'quote'
    return DocumentTemplate.objects.filter(slug=slug, is_active=True).first()


def _fallback_fields(template: DocumentTemplate | None, topic: str) -> dict[str, Any]:
    topic = topic.strip()
    if not template:
        return {'summary': topic, 'notes': topic}
    keys = [f.get('key') for f in (template.fields_schema or []) if f.get('key')]
    fields: dict[str, Any] = {}
    primary = keys[0] if keys else 'summary'
    fields[primary] = topic
    for key in keys[1:]:
        if key in ('notes', 'summary', 'project_description', 'findings'):
            fields[key] = topic
        else:
            fields[key] = ''
    return fields


def _gemini_generate(
    topic: str,
    profile: BusinessProfile,
    template: DocumentTemplate | None,
) -> dict[str, Any] | None:
    api_key = getattr(settings, 'GEMINI_API_KEY', '') or ''
    if not api_key.strip():
        return None
    try:
        import google.generativeai as genai
    except ImportError:
        return None

    schema = template.fields_schema if template else []
    field_keys = [f.get('key') for f in schema if f.get('key')]
    doc_types = [c[0] for c in DocumentTemplate.DocType.choices]
    default_type = template.doc_type if template else 'quote'

    system = f"""אתה מייצר מסמך עסקי בעברית לפלטפורמת מנדלס.
החזר JSON בלבד בפורמט:
{{"docType":"{default_type}","title":"כותרת קצרה","fieldsData":{{...}}}}
כללים:
- docType אחד מ: {doc_types}
- title — עד 80 תווים, משקף את הנושא
- fieldsData — מפתחות בדיוק: {field_keys or ['summary']}
- עברית מקצועית, מותאמת לעסק קטן בישראל
- מלא את כל השדות בצורה הגיונית לפי הנושא שהמשתמש כתב
- אל תוסיף markdown או הסברים מחוץ ל-JSON"""

    business = profile.business_name or 'העסק'
    trade_label = _trade_label(profile)
    user_prompt = json.dumps(
        {
            'topic': topic,
            'businessName': business,
            'trade': trade_label,
            'templateName': template.name if template else 'מסמך כללי',
            'fieldsSchema': schema,
        },
        ensure_ascii=False,
    )

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            getattr(settings, 'GEMINI_MODEL', 'gemini-2.5-flash'),
            system_instruction=system,
        )
        result = model.generate_content(user_prompt)
        parsed = _parse_json_reply(_safe_gemini_text(result))
        if not parsed:
            return None
        doc_type = str(parsed.get('docType') or default_type)
        if doc_type not in doc_types:
            doc_type = default_type
        title = str(parsed.get('title') or topic).strip()[:200]
        raw_fields = parsed.get('fieldsData') or {}
        fields_data = {}
        if isinstance(raw_fields, dict):
            for k, v in raw_fields.items():
                fields_data[str(k)] = v if isinstance(v, (int, float)) else str(v)
        if not fields_data:
            fields_data = _fallback_fields(template, topic)
        return {
            'docType': doc_type,
            'title': title or topic[:200],
            'fieldsData': fields_data,
            'source': 'gemini',
            'notice': '',
        }
    except Exception as exc:
        logger.warning('Gemini document generate failed: %s', exc)
        return None


def generate_document_content(
    topic: str,
    profile: BusinessProfile,
    *,
    doc_type_hint: str = '',
) -> dict[str, Any]:
    """Return docType, title, fieldsData, template, source, notice."""
    topic = (topic or '').strip()[:MAX_TOPIC]
    if not topic:
        raise ValueError('נושא המסמך נדרש')

    template = None
    if doc_type_hint:
        template = DocumentTemplate.objects.filter(doc_type=doc_type_hint, is_active=True).first()
    if not template:
        template = _pick_template(topic)

    ai = _gemini_generate(topic, profile, template)
    if ai:
        if not template or template.doc_type != ai['docType']:
            template = DocumentTemplate.objects.filter(
                doc_type=ai['docType'], is_active=True,
            ).first() or template
        return {**ai, 'template': template}

    fields_data = _fallback_fields(template, topic)
    type_labels = dict(DocumentTemplate.DocType.choices)
    return {
        'docType': template.doc_type if template else 'quote',
        'title': topic[:80],
        'fieldsData': fields_data,
        'template': template,
        'source': 'local',
        'notice': 'AI לא זמין — נוצרה טיוטה בסיסית לפי הנושא',
    }
