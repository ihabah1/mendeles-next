"""Twilio WhatsApp webhook — inbound messages → AI agent reply."""
import logging

from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from api.staff_permissions import IsStaffPortalUser

from .services.whatsapp_agent import (
    build_whatsapp_reply,
    twiml_message,
    whatsapp_config_status,
    whatsapp_enabled,
)

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(['POST'])
def whatsapp_webhook(request):
    """
    POST /api/whatsapp/webhook/
    Twilio sends application/x-www-form-urlencoded: From, Body, To, ...
  """
    if not whatsapp_enabled():
        logger.info('WhatsApp webhook ignored — agent disabled')
        return HttpResponse(twiml_message('שירות WhatsApp אינו פעיל כרגע.'), content_type='application/xml')

    from_wa = request.POST.get('From', '')
    body = request.POST.get('Body', '')
    logger.info('WhatsApp inbound from=%s len=%s', from_wa, len(body or ''))

    try:
        reply = build_whatsapp_reply(from_wa=from_wa, body=body)
    except Exception:
        logger.exception('WhatsApp agent error')
        reply = 'מצטערים, משהו השתבש. נסה שוב בעוד רגע או פנה לתמיכה באתר.'

    return HttpResponse(twiml_message(reply), content_type='application/xml')


@api_view(['GET'])
@permission_classes([AllowAny])
def whatsapp_status(request):
    """GET /api/whatsapp/status/ — public config summary (no secrets)."""
    return Response(whatsapp_config_status())


@api_view(['POST'])
@permission_classes([IsStaffPortalUser])
def whatsapp_simulate(request):
    """POST /api/whatsapp/simulate/ — staff test agent without Twilio."""
    body = (request.data.get('message') or '').strip()
    from_wa = (request.data.get('from') or 'whatsapp:+972501234567').strip()
    if not body:
        return Response({'error': 'message נדרש'}, status=status.HTTP_400_BAD_REQUEST)
    reply = build_whatsapp_reply(from_wa=from_wa, body=body)
    return Response({'reply': reply, 'from': from_wa})


@api_view(['GET'])
@permission_classes([AllowAny])
def whatsapp_setup_info(request):
    """GET /api/whatsapp/setup/ — webhook URL hint for Twilio console."""
    base = (getattr(settings, 'FRONTEND_URL', '') or request.build_absolute_uri('/')).rstrip('/')
    api_base = (getattr(settings, 'BACKEND_PUBLIC_URL', '') or '').rstrip('/')
    if not api_base:
        api_base = request.build_absolute_uri('/api').replace('/api', '')
    webhook = f'{api_base}/api/whatsapp/webhook/'
    return Response({
        'webhookUrl': webhook,
        'frontendUrl': base,
        'status': whatsapp_config_status(),
        'twilioConsole': 'https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn',
        'steps': [
            'הפעל WhatsApp Sandbox או מספר עסקי ב-Twilio',
            'הגדר TWILIO_WHATSAPP_FROM=whatsapp:+מספר',
            f'Webhook POST: {webhook}',
            'הגדר WHATSAPP_AGENT_ENABLED=true',
            'אופציונלי: GEMINI_API_KEY לתשובות חכמות',
        ],
    })
