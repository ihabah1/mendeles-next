"""Firebase Admin SDK — verify Phone Auth ID tokens on the backend."""
import json
import logging
import os

from django.conf import settings

logger = logging.getLogger(__name__)

_firebase_app = None


def _service_account_json() -> str:
    return (
        getattr(settings, 'FIREBASE_SERVICE_ACCOUNT_JSON', '')
        or os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON', '')
    ).strip()


def firebase_configured() -> bool:
    return bool(_service_account_json())


def firebase_config_status() -> dict:
    if not firebase_configured():
        return {
            'configured': False,
            'hint': 'הוסף FIREBASE_SERVICE_ACCOUNT_JSON (JSON מלא) בשירות Backend',
        }
    return {'configured': True, 'hint': None}


def _ensure_app():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app
    raw = _service_account_json()
    if not raw:
        raise ValueError('Firebase Admin לא מוגדר')

    import firebase_admin
    from firebase_admin import credentials

    try:
        info = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError('FIREBASE_SERVICE_ACCOUNT_JSON אינו JSON תקין') from exc

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
