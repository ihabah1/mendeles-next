"""Firebase Admin SDK — verify Phone Auth ID tokens on the backend."""
import base64
import json
import logging
import os

from django.conf import settings

logger = logging.getLogger(__name__)

_firebase_app = None


def _service_account_raw() -> str:
    b64 = (
        getattr(settings, 'FIREBASE_SERVICE_ACCOUNT_JSON_BASE64', '')
        or os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON_BASE64', '')
    ).strip()
    if b64:
        try:
            return base64.b64decode(b64).decode('utf-8')
        except (ValueError, UnicodeDecodeError) as exc:
            raise ValueError('FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 לא תקין') from exc
    return (
        getattr(settings, 'FIREBASE_SERVICE_ACCOUNT_JSON', '')
        or os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON', '')
    ).strip()


def _parse_service_account_json(raw: str) -> dict:
    """Parse service account JSON (Railway may escape newlines or wrap in quotes)."""
    text = raw.strip()
    if not text:
        raise ValueError('ריק')

    if (text.startswith("'") and text.endswith("'")) or (
        text.startswith('"') and text.endswith('"') and text.count('"') == 2
    ):
        text = text[1:-1].strip()

    if '\\n' in text and '\n' not in text:
        text = text.replace('\\n', '\n')

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Optional: entire JSON stored as base64 (avoids Railway multiline issues)
    try:
        decoded = base64.b64decode(text).decode('utf-8')
        return json.loads(decoded)
    except (ValueError, json.JSONDecodeError) as exc:
        raise ValueError('FIREBASE_SERVICE_ACCOUNT_JSON אינו JSON תקין') from exc


def firebase_configured() -> bool:
    try:
        raw = _service_account_raw()
    except ValueError:
        return False
    if not raw:
        return False
    try:
        _parse_service_account_json(raw)
        return True
    except ValueError:
        return False


def firebase_config_status() -> dict:
    try:
        raw = _service_account_raw()
    except ValueError as exc:
        return {
            'configured': False,
            'json_present': True,
            'json_valid': False,
            'project_id': None,
            'hint': str(exc),
        }
    if not raw:
        return {
            'configured': False,
            'json_present': False,
            'json_valid': False,
            'project_id': None,
            'hint': (
                'חסר FIREBASE_SERVICE_ACCOUNT_JSON ב-Railway → שירות Backend '
                '(eloquent-perfection). Firebase Console → Service accounts → Generate new private key'
            ),
        }
    try:
        info = _parse_service_account_json(raw)
    except ValueError as exc:
        return {
            'configured': False,
            'json_present': True,
            'json_valid': False,
            'project_id': None,
            'hint': (
                f'{exc}. הדבק את כל קובץ ה-JSON בשורה אחת, או השתמש ב-FIREBASE_SERVICE_ACCOUNT_JSON_BASE64'
            ),
        }
    return {
        'configured': True,
        'json_present': True,
        'json_valid': True,
        'project_id': info.get('project_id'),
        'hint': None,
    }


def _ensure_app():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app
    raw = _service_account_raw()
    if not raw:
        raise ValueError('Firebase Admin לא מוגדר')

    import firebase_admin
    from firebase_admin import credentials

    info = _parse_service_account_json(raw)
    cred = credentials.Certificate(info)
    _firebase_app = firebase_admin.initialize_app(cred)
    logger.info('Firebase Admin initialized project=%s', info.get('project_id'))
    return _firebase_app


def verify_firebase_id_token(id_token: str) -> dict:
    """Returns decoded token claims; raises ValueError on failure."""
    from firebase_admin import auth

    _ensure_app()
    token = (id_token or '').strip()
    if not token:
        raise ValueError('חסר firebase_token')

    try:
        claims = auth.verify_id_token(token)
    except Exception as exc:
        logger.warning('Firebase verify_id_token failed: %s', exc)
        raise ValueError('אסימון Firebase לא תקף') from exc

    if not claims.get('phone_number'):
        raise ValueError('אסימון Firebase ללא מספר טלפון')

    return claims
