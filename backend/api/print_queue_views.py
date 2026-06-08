"""Print queue API — staff dashboard + local print agent (x-api-key)."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from admin_panel.portal.models import PrintJob

from api.admin_views import IsStaffUser
from api.print_views import _require_print_key
from api.services.integration_log import log_integration
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
    queue_counts,
    record_agent_heartbeat,
    retry_job,
)
from admin_panel.portal.models import IntegrationLog, Order


@api_view(['GET'])
@permission_classes([IsStaffUser])
def admin_print_queue(request):
    """GET /api/admin/print-queue/?status=queued"""
    status_filter = (request.query_params.get('status') or '').strip()
    qs = (
        PrintJob.objects.select_related('order', 'order__customer', 'approved_by')
        .order_by('-priority', '-created_at')
    )
    if status_filter:
        qs = qs.filter(status=status_filter)
    else:
        qs = qs.filter(
            status__in=ACTIVE_STATUSES | {PrintJob.Status.FAILED},
        )
    jobs = [job_to_dict(j) for j in qs[:300]]
    printer_status = printer_status_summary()
    return Response({
        'jobs': jobs,
        'count': len(jobs),
        'counts': queue_counts(),
        'printerStatus': printer_status,
        'agents': printer_status['agents'],
        'anyAgentOnline': printer_status['agentOnline'],
        'canStartPrinting': printer_status['canStartPrinting'],
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


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_print_queue_enqueue(request, order_id: int):
    order = Order.objects.filter(pk=order_id).first()
    if not order:
        return Response({'error': 'הזמנה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)
    job = enqueue_order(order)
    return Response({'status': 'ok', 'job': job_to_dict(job)})


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
