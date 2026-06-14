"""Print queue API — staff dashboard + local print agent (x-api-key)."""
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from admin_panel.portal.models import PrintJob

from api.admin_views import IsStaffUser
from api.print_views import _require_print_key
from api.services.integration_log import log_integration
from api.services.order_search import apply_order_doc_filters, apply_order_search
from api.services.print_queue_service import (
    ACTIVE_STATUSES,
    approve_job,
    approve_jobs_for_orders,
    cancel_job,
    claim_next_job,
    enqueue_order,
    fail_job,
    job_to_dict,
    printer_status_summary,
    promote_job,
    queue_counts,
    record_agent_heartbeat,
    register_agent_manual,
    retry_job,
    send_job_to_print,
    set_job_priority,
    skip_job_to_step,
)
from api.services.print_service import (
    print_api_key_configured,
    print_control_config,
    verify_print_api_key,
)
from admin_panel.portal.models import IntegrationLog, Order


@api_view(['GET'])
@permission_classes([IsStaffUser])
def admin_print_queue(request):
    """GET /api/admin/print-queue/?status=queued"""
    status_filter = (request.query_params.get('status') or '').strip()
    search_q = (
        request.query_params.get('q', '')
        or request.query_params.get('search', '')
    ).strip()
    qs = (
        PrintJob.objects.select_related('order', 'order__customer', 'approved_by')
        .order_by('-priority', '-created_at')
    )
    qs = apply_order_search(qs, search_q, prefix='order__')
    qs = apply_order_doc_filters(
        qs,
        has_scan=request.query_params.get('has_scan'),
        has_invoice=request.query_params.get('has_invoice'),
        prefix='order__',
    )
    if status_filter == 'awaiting_scan':
        qs = qs.filter(
            status=PrintJob.Status.PRINTED,
            order__scan_pdf__isnull=True,
        ).exclude(order__status=Order.Status.COMPLETED)
    elif status_filter == 'scanned':
        qs = qs.exclude(order__scan_pdf__isnull=True).exclude(order__scan_pdf=b'')
    elif status_filter:
        qs = qs.filter(status=status_filter)
    elif not search_q:
        qs = qs.filter(
            status__in=ACTIVE_STATUSES | {PrintJob.Status.FAILED},
        )
    jobs = [job_to_dict(j) for j in qs[:300]]
    printer_status = printer_status_summary()
    site_base = (getattr(settings, 'FRONTEND_URL', '') or '').strip().rstrip('/')
    if not site_base:
        site_base = request.build_absolute_uri('/').rstrip('/')
        if site_base.endswith('/api'):
            site_base = site_base[:-4]
    return Response({
        'jobs': jobs,
        'count': len(jobs),
        'counts': queue_counts(),
        'printerStatus': printer_status,
        'agents': printer_status['agents'],
        'anyAgentOnline': printer_status['agentOnline'],
        'canStartPrinting': printer_status['canStartPrinting'],
        'printConfig': print_control_config(site_base_url=site_base),
    })


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_print_queue_approve(request, job_id: int):
    job = PrintJob.objects.select_related('order').filter(pk=job_id).first()
    if not job:
        return Response({'error': 'משימה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)
    approve_job(job, request.user)
    log_integration(
        IntegrationLog.Source.PRINT,
        IntegrationLog.Level.INFO,
        f'אושר לתור: {job.order.order_number}',
        order=job.order,
    )
    return Response({'status': 'ok', 'job': job_to_dict(job)})


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_print_queue_approve_bulk(request):
    order_ids = request.data.get('order_ids') or request.data.get('orderIds') or []
    job_ids = request.data.get('job_ids') or request.data.get('jobIds') or []
    approved = []
    if job_ids:
        for jid in job_ids:
            job = PrintJob.objects.select_related('order').filter(pk=jid).first()
            if job:
                approved.append(approve_job(job, request.user))
    if order_ids:
        approved.extend(approve_jobs_for_orders(order_ids, request.user))
    return Response({
        'status': 'ok',
        'count': len(approved),
        'jobs': [job_to_dict(j) for j in approved],
    })


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_print_queue_retry(request, job_id: int):
    job = PrintJob.objects.select_related('order').filter(pk=job_id).first()
    if not job:
        return Response({'error': 'משימה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)
    retry_job(job)
    return Response({'status': 'ok', 'job': job_to_dict(job)})


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_print_queue_cancel(request, job_id: int):
    job = PrintJob.objects.select_related('order').filter(pk=job_id).first()
    if not job:
        return Response({'error': 'משימה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)
    cancel_job(job)
    return Response({'status': 'ok', 'job': job_to_dict(job)})


_SKIP_MESSAGES = {
    'approve': 'סומן כאושר',
    'claim': 'סומן כנלקח',
    'print': 'סומן כהודפס — ניתן לסרוק ב-scan_app',
    'scan': 'סומן כהושלם (ללא סריקה)',
}


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_print_queue_skip(request, job_id: int):
    """POST /api/admin/print-queue/<id>/skip/ { step: approve|claim|print|scan }"""
    job = PrintJob.objects.select_related('order').filter(pk=job_id).first()
    if not job:
        return Response({'error': 'משימה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)
    step = (request.data.get('step') or 'print').strip().lower()
    try:
        skip_job_to_step(job, step, user=request.user)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    log_integration(
        IntegrationLog.Source.PRINT,
        IntegrationLog.Level.INFO,
        f'דילוג ({step}): {job.order.order_number}',
        order=job.order,
        details={'step': step},
    )
    msg = _SKIP_MESSAGES.get(step, 'עודכן')
    return Response({
        'status': 'ok',
        'detail': f'ההזמנה {job.order.order_number} — {msg}',
        'job': job_to_dict(job),
    })


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_print_queue_skip_to_scan(request, job_id: int):
    """Skip physical print — mark printed so scan_app can pick up the order."""
    job = PrintJob.objects.select_related('order').filter(pk=job_id).first()
    if not job:
        return Response({'error': 'משימה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)
    try:
        skip_job_to_step(job, 'print', user=request.user)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    log_integration(
        IntegrationLog.Source.PRINT,
        IntegrationLog.Level.INFO,
        f'דילוג להדפסה — ממתין לסריקה: {job.order.order_number}',
        order=job.order,
        details={'step': 'print'},
    )
    return Response({
        'status': 'ok',
        'detail': f'ההזמנה {job.order.order_number} — {_SKIP_MESSAGES["print"]}',
        'job': job_to_dict(job),
    })


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_print_queue_enqueue(request, order_id: int):
    order = Order.objects.filter(pk=order_id).first()
    if not order:
        return Response({'error': 'הזמנה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)
    job = enqueue_order(order)
    return Response({'status': 'ok', 'job': job_to_dict(job)})


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_print_queue_enqueue_by_number(request):
    """POST { orderNumber } — הכנסה ידנית לתור לפי מספר הזמנה."""
    order_number = (
        request.data.get('orderNumber')
        or request.data.get('order_number')
        or ''
    ).strip()
    if not order_number:
        return Response({'error': 'חסר מספר הזמנה'}, status=status.HTTP_400_BAD_REQUEST)
    order = Order.objects.filter(order_number__iexact=order_number).first()
    if not order:
        return Response({'error': 'הזמנה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)
    job = enqueue_order(order)
    return Response({'status': 'ok', 'detail': f'{order_number} נוסף לתור', 'job': job_to_dict(job)})


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_print_queue_promote(request, job_id: int):
    job = PrintJob.objects.select_related('order').filter(pk=job_id).first()
    if not job:
        return Response({'error': 'משימה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)
    promote_job(job)
    return Response({
        'status': 'ok',
        'detail': f'קודם בתור (עדיפות {job.priority})',
        'job': job_to_dict(job),
    })


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_print_queue_priority(request, job_id: int):
    job = PrintJob.objects.select_related('order').filter(pk=job_id).first()
    if not job:
        return Response({'error': 'משימה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)
    raw = request.data.get('priority')
    try:
        priority = int(raw)
    except (TypeError, ValueError):
        return Response({'error': 'עדיפות לא תקינה'}, status=status.HTTP_400_BAD_REQUEST)
    set_job_priority(job, priority)
    return Response({'status': 'ok', 'job': job_to_dict(job)})


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_print_queue_send(request, job_id: int):
    """שליחה להדפסה — רענון payload, אישור ושחרור תפיסה."""
    job = PrintJob.objects.select_related('order').filter(pk=job_id).first()
    if not job:
        return Response({'error': 'משימה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)
    print_mode = (
        request.data.get('printMode')
        or request.data.get('print_mode')
        or None
    )
    if print_mode:
        print_mode = str(print_mode).strip().lower()
    try:
        send_job_to_print(job, request.user, print_mode=print_mode)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    log_integration(
        IntegrationLog.Source.PRINT,
        IntegrationLog.Level.INFO,
        f'נשלח להדפסה: {job.order.order_number}',
        order=job.order,
        details={'printMode': print_mode or 'default'},
    )
    return Response({
        'status': 'ok',
        'detail': f'נשלח להדפסה — {job.order.order_number}',
        'job': job_to_dict(job),
    })


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_print_verify_api_key(request):
    """בדיקת מפתח API שהוזן ידנית (ללא חשיפת המפתח בשרת)."""
    candidate = (
        request.data.get('apiKey')
        or request.data.get('api_key')
        or ''
    ).strip()
    if not candidate:
        return Response({'error': 'הזן מפתח API'}, status=status.HTTP_400_BAD_REQUEST)
    if not print_api_key_configured():
        return Response(
            {'error': 'PRINT_API_KEY לא מוגדר בשרת'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    ok = verify_print_api_key(candidate)
    return Response({
        'valid': ok,
        'detail': 'מפתח תקין — תואם לשרת' if ok else 'מפתח שגוי — לא תואם ל-PRINT_API_KEY ב-Railway',
    })


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_print_register_agent(request):
    """רישום ידני של סוכן — לתיקון כשה-heartbeat לא מגיע."""
    agent_id = (
        request.data.get('agentId')
        or request.data.get('agent_id')
        or 'default'
    ).strip()[:64]
    hostname = (request.data.get('hostname') or 'manual-dashboard')[:120]
    printer_ready = bool(
        request.data.get('printerReady', request.data.get('printer_ready', True))
    )
    printer_message = (
        request.data.get('printerMessage')
        or request.data.get('printer_message')
        or 'רשום ידנית מדשבורד'
    )[:200]
    hb = register_agent_manual(
        agent_id=agent_id,
        hostname=hostname,
        printer_ready=printer_ready,
        printer_message=printer_message,
    )
    return Response({
        'status': 'ok',
        'detail': f'סוכן {agent_id} נרשם',
        'agent': {
            'agentId': hb.agent_id,
            'hostname': hb.hostname,
            'printerReady': hb.printer_ready,
            'lastSeenAt': hb.last_seen_at.isoformat() if hb.last_seen_at else None,
        },
    })


# ── Local print agent (x-api-key) ─────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([])
def print_agent_heartbeat(request):
    denied = _require_print_key(request)
    if denied:
        return denied
    agent_id = (request.data.get('agentId') or request.data.get('agent_id') or 'default').strip()
    hostname = (request.data.get('hostname') or '')[:120]
    version = (request.data.get('version') or '')[:40]
    printer_ready_raw = request.data.get('printerReady', request.data.get('printer_ready'))
    printer_ready = bool(printer_ready_raw) if printer_ready_raw is not None else None
    printer_message = (request.data.get('printerMessage') or request.data.get('printer_message') or '')[:200]
    hb = record_agent_heartbeat(
        agent_id=agent_id,
        hostname=hostname,
        version=version,
        printer_ready=printer_ready,
        printer_message=printer_message,
    )
    return Response({
        'status': 'ok',
        'agentId': hb.agent_id,
        'online': True,
        'printerReady': hb.printer_ready,
    })


@api_view(['GET'])
@permission_classes([])
def print_jobs_pull(request):
    """GET /api/print/jobs/pull/ — agent claims one approved job + payload."""
    denied = _require_print_key(request)
    if denied:
        return denied
    agent_id = (request.query_params.get('agentId') or request.query_params.get('agent_id') or 'default').strip()
    record_agent_heartbeat(agent_id=agent_id, printer_ready=None)
    job = claim_next_job(agent_id)
    if not job:
        return Response({'job': None})
    return Response({'job': job_to_dict(job, include_payload=True)})


@api_view(['POST'])
@permission_classes([])
def print_job_fail(request, job_id: int):
    denied = _require_print_key(request)
    if denied:
        return denied
    job = PrintJob.objects.select_related('order').filter(pk=job_id).first()
    if not job:
        return Response({'error': 'משימה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)
    error = request.data.get('error') or request.data.get('detail') or 'הדפסה נכשלה'
    fail_job(job, str(error))
    log_integration(
        IntegrationLog.Source.PRINT,
        IntegrationLog.Level.ERROR,
        f'הדפסה נכשלה: {job.order.order_number} — {error}',
        order=job.order,
    )
    return Response({'status': 'ok', 'job': job_to_dict(job)})
