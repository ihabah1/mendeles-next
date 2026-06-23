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
from api.staff_permissions import IsStaffPortalUser

IsStaffUser = IsStaffPortalUser
logger = logging.getLogger(__name__)


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
        call_command('daily_sync', stdout=stdout, stderr=stderr)
        return Response({
            'detail': 'סנכרון יומי הושלם',
            'stdout': stdout.getvalue(),
            'startedAt': started.isoformat(),
            'snapshot': build_monitoring_snapshot(),
        })
    except Exception as exc:
        err_text = str(exc) or stderr.getvalue() or stdout.getvalue() or 'נכשל'
        log_automation(
            AutomationLog.Job.DAILY_SYNC,
            f'הרצה ידנית נכשלה: {err_text}',
            level=AutomationLog.Level.ERROR,
            details={
                'stderr': stderr.getvalue()[:500],
                'stdout': stdout.getvalue()[:500],
            },
        )
        return Response(
            {'detail': err_text, 'stdout': stdout.getvalue(), 'stderr': stderr.getvalue()},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


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
