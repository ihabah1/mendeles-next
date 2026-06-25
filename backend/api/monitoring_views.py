"""Staff API — infrastructure monitoring dashboard."""
import logging
from io import StringIO

from django.core.management import call_command
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from admin_panel.portal.models import AutomationLog, GuideChatInquiry

from api.services.automation_log import log_automation
from api.services.monitoring import build_monitoring_snapshot
from api.services.pais_draw import PAIS_FETCH_VERSION
from api.staff_permissions import IsStaffPortalUser

IsStaffUser = IsStaffPortalUser
logger = logging.getLogger(__name__)


def _sync_log_lines(stdout: str, stderr: str) -> list[str]:
    lines: list[str] = []
    for chunk in (stdout, stderr):
        if not chunk:
            continue
        for line in chunk.splitlines():
            text = line.rstrip()
            if text:
                lines.append(text)
    return lines


def _sync_response_payload(
    *,
    detail: str,
    stdout: str,
    stderr: str,
    started,
    ok: bool,
    snapshot=None,
) -> dict:
    finished = timezone.now()
    duration_ms = int((finished - started).total_seconds() * 1000)
    return {
        'detail': detail,
        'stdout': stdout,
        'stderr': stderr,
        'logs': _sync_log_lines(stdout, stderr),
        'durationMs': duration_ms,
        'startedAt': started.isoformat(),
        'finishedAt': finished.isoformat(),
        'paisFetchVersion': PAIS_FETCH_VERSION,
        'ok': ok,
        'snapshot': snapshot,
    }


@api_view(['GET'])
@permission_classes([IsStaffUser])
def admin_monitoring(request):
    try:
        return Response(build_monitoring_snapshot())
    except Exception as exc:
        logger.exception('admin_monitoring failed')
        return Response(
            {'detail': f'שגיאה בבניית ניטור: {exc}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_run_daily_sync(request):
    """Trigger daily_sync manually from dashboard."""
    started = timezone.now()
    stdout = StringIO()
    stderr = StringIO()
    try:
        call_command('daily_sync', stdout=stdout, stderr=stderr, light=True)
        out = stdout.getvalue()
        err = stderr.getvalue()
        return Response(_sync_response_payload(
            detail='סנכרון יומי הושלם בהצלחה',
            stdout=out,
            stderr=err,
            started=started,
            ok=True,
            snapshot=None,
        ))
    except Exception as exc:
        err_text = str(exc) or stderr.getvalue() or stdout.getvalue() or 'נכשל'
        out = stdout.getvalue()
        err = stderr.getvalue()
        log_automation(
            AutomationLog.Job.DAILY_SYNC,
            f'הרצה ידנית נכשלה: {err_text}',
            level=AutomationLog.Level.ERROR,
            details={
                'stderr': err[:2000],
                'stdout': out[:2000],
            },
        )
        payload = _sync_response_payload(
            detail=err_text,
            stdout=out,
            stderr=err or str(exc),
            started=started,
            ok=False,
            snapshot=None,
        )
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsStaffUser])
def admin_chat_inquiries(request):
    try:
        limit = min(int(request.query_params.get('limit', 40)), 100)
    except (TypeError, ValueError):
        limit = 40

    qs = GuideChatInquiry.objects.select_related('customer').order_by('-updated_at')[:limit]
    items = []
    for row in qs:
        customer = row.customer
        items.append({
            'id': row.id,
            'sessionId': row.session_id,
            'createdAt': row.created_at.isoformat(),
            'updatedAt': row.updated_at.isoformat(),
            'customerName': (
                customer.display_name or customer.full_name or customer.email
                if customer
                else (row.guest_name or 'אורח')
            ),
            'customerEmail': customer.email if customer else '',
            'customerPhone': customer.phone if customer else '',
            'pagePath': row.page_path,
            'ipAddress': row.ip_address,
            'messages': row.messages,
            'aiSummary': row.ai_summary,
            'escalated': row.escalated,
        })
    return Response({'inquiries': items, 'count': len(items)})
