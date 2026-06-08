"""Cloud print queue — enqueue on submit, staff approves, local agent pulls."""
from __future__ import annotations

import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from admin_panel.portal.models import Order, PrintAgentHeartbeat, PrintJob

from api.services.print_service import build_forms_print_payload

logger = logging.getLogger(__name__)

ACTIVE_STATUSES = {
    PrintJob.Status.QUEUED,
    PrintJob.Status.APPROVED,
    PrintJob.Status.CLAIMED,
    PrintJob.Status.PRINTING,
}


def _agent_online_seconds() -> int:
    try:
        return max(30, int(getattr(settings, 'PRINT_AGENT_ONLINE_SECONDS', 90)))
    except (TypeError, ValueError):
        return 90


def auto_enqueue_enabled() -> bool:
    raw = getattr(settings, 'PRINT_QUEUE_AUTO_ENQUEUE', True)
    if isinstance(raw, str):
        return raw.strip().lower() not in ('0', 'false', 'no', 'off')
    return bool(raw)


def agent_is_online(agent_id: str = 'default') -> bool:
    hb = PrintAgentHeartbeat.objects.filter(agent_id=agent_id).first()
    if not hb or not hb.last_seen_at:
        return False
    delta = timezone.now() - hb.last_seen_at
    return delta.total_seconds() <= _agent_online_seconds()


def record_agent_heartbeat(
    *,
    agent_id: str = 'default',
    hostname: str = '',
    version: str = '',
    printer_ready: bool | None = None,
    printer_message: str = '',
) -> PrintAgentHeartbeat:
    hb, _ = PrintAgentHeartbeat.objects.get_or_create(agent_id=agent_id)
    hb.hostname = (hostname or hb.hostname or '')[:120]
    hb.version = (version or hb.version or '')[:40]
    if printer_ready is not None:
        hb.printer_ready = bool(printer_ready)
    hb.printer_message = (printer_message or hb.printer_message or '')[:200]
    hb.last_seen_at = timezone.now()
    hb.save(
        update_fields=[
            'hostname',
            'version',
            'printer_ready',
            'printer_message',
            'last_seen_at',
            'updated_at',
        ],
    )
    return hb


def printer_status_summary() -> dict:
    """Aggregate printer readiness for the admin print-queue UI."""
    agents = list(PrintAgentHeartbeat.objects.order_by('-last_seen_at'))
    online_agents = []
    ready_agents = []
    now = timezone.now()

    for hb in agents:
        online = agent_is_online(hb.agent_id)
        entry = {
            'agentId': hb.agent_id,
            'hostname': hb.hostname or None,
            'version': hb.version or None,
            'online': online,
            'printerReady': online and hb.printer_ready,
            'printerMessage': hb.printer_message or None,
            'lastSeenAt': hb.last_seen_at.isoformat() if hb.last_seen_at else None,
            'lastSeenSecondsAgo': (
                int((now - hb.last_seen_at).total_seconds()) if hb.last_seen_at else None
            ),
        }
        if online:
            online_agents.append(entry)
            if hb.printer_ready:
                ready_agents.append(entry)

    any_online = bool(online_agents)
    can_start = bool(ready_agents)

    if can_start:
        message = 'מדפסת מחוברת — ניתן להתחיל הדפסה'
        level = 'ready'
    elif any_online:
        message = 'סוכן מחובר — ממתין לאישור מהמדפסת המקומית'
        level = 'agent_only'
    elif agents:
        message = 'מדפסת לא מחוברת — הפעל print_agent על מחשב ההדפסה'
        level = 'offline'
    else:
        message = 'סוכן הדפסה לא הוגדר — הפעל print_agent בפעם הראשונה'
        level = 'never_seen'

    return {
        'level': level,
        'message': message,
        'canStartPrinting': can_start,
        'agentOnline': any_online,
        'printerReady': can_start,
        'agents': [
            {
                'agentId': hb.agent_id,
                'hostname': hb.hostname or None,
                'version': hb.version or None,
                'online': agent_is_online(hb.agent_id),
                'printerReady': agent_is_online(hb.agent_id) and hb.printer_ready,
                'printerMessage': hb.printer_message or None,
                'lastSeenAt': hb.last_seen_at.isoformat() if hb.last_seen_at else None,
                'lastSeenSecondsAgo': (
                    int((now - hb.last_seen_at).total_seconds()) if hb.last_seen_at else None
                ),
            }
            for hb in agents
        ],
    }


def build_job_payload(order: Order) -> dict:
    return build_forms_print_payload(order)


def enqueue_order(order: Order, *, refresh_payload: bool = True) -> PrintJob:
    """Add or refresh a print job for an order (idempotent)."""
    payload = build_job_payload(order) if refresh_payload else {}
    with transaction.atomic():
        job, created = PrintJob.objects.select_for_update().get_or_create(
            order=order,
            defaults={
                'status': PrintJob.Status.QUEUED,
                'payload_json': payload,
            },
        )
        if not created:
            if job.status in (PrintJob.Status.PRINTED, PrintJob.Status.CANCELLED):
                return job
            if refresh_payload:
                job.payload_json = payload
            if job.status == PrintJob.Status.FAILED:
                job.status = PrintJob.Status.QUEUED
                job.last_error = ''
            job.save()
    logger.info('Print job enqueued order=%s status=%s', order.order_number, job.status)
    return job


def approve_job(job: PrintJob, user=None) -> PrintJob:
    if job.status in (PrintJob.Status.PRINTED, PrintJob.Status.CANCELLED):
        return job
    job.status = PrintJob.Status.APPROVED
    job.approved_at = timezone.now()
    job.approved_by = user
    job.last_error = ''
    job.save(update_fields=['status', 'approved_at', 'approved_by', 'last_error', 'updated_at'])
    return job


def approve_jobs_for_orders(order_ids: list[int], user=None) -> list[PrintJob]:
    jobs = []
    for oid in order_ids:
        order = Order.objects.filter(pk=oid).first()
        if not order:
            continue
        job = enqueue_order(order)
        jobs.append(approve_job(job, user))
    return jobs


def cancel_job(job: PrintJob) -> PrintJob:
    job.status = PrintJob.Status.CANCELLED
    job.save(update_fields=['status', 'updated_at'])
    return job


def retry_job(job: PrintJob) -> PrintJob:
    if job.status not in (PrintJob.Status.FAILED, PrintJob.Status.CANCELLED):
        return job
    job.status = PrintJob.Status.QUEUED
    job.last_error = ''
    job.claimed_at = None
    job.claimed_by_agent = ''
    job.attempts = 0
    job.save()
    return job


def claim_next_job(agent_id: str = 'default') -> PrintJob | None:
    """Atomically claim the highest-priority approved job for a local agent."""
    with transaction.atomic():
        job = (
            PrintJob.objects.select_for_update()
            .filter(status=PrintJob.Status.APPROVED)
            .select_related('order', 'order__customer')
            .order_by('-priority', 'created_at')
            .first()
        )
        if not job:
            return None

        job.status = PrintJob.Status.CLAIMED
        job.claimed_at = timezone.now()
        job.claimed_by_agent = (agent_id or 'default')[:64]
        job.attempts += 1
        job.save(
            update_fields=[
                'status',
                'claimed_at',
                'claimed_by_agent',
                'attempts',
                'updated_at',
            ],
        )

        order = job.order
        if order.status in (Order.Status.PAID, Order.Status.PENDING):
            order.status = Order.Status.PRINTING
            order.save(update_fields=['status'])

    return job


def mark_job_printing(job: PrintJob) -> PrintJob:
    job.status = PrintJob.Status.PRINTING
    job.save(update_fields=['status', 'updated_at'])
    order = job.order
    order.status = Order.Status.PRINTING
    order.save(update_fields=['status'])
    return job


def fail_job(job: PrintJob, error: str) -> PrintJob:
    msg = (error or 'שגיאה לא ידועה')[:500]
    job.last_error = msg
    if job.attempts >= job.max_attempts:
        job.status = PrintJob.Status.FAILED
        job.claimed_at = None
        job.claimed_by_agent = ''
    else:
        job.status = PrintJob.Status.APPROVED
    job.save(
        update_fields=[
            'status',
            'last_error',
            'claimed_at',
            'claimed_by_agent',
            'updated_at',
        ],
    )
    if job.status == PrintJob.Status.FAILED:
        order = job.order
        if order.status == Order.Status.PRINTING:
            order.status = Order.Status.PAID
            order.save(update_fields=['status'])
    return job


def complete_job_for_order(order: Order) -> PrintJob | None:
    try:
        job = order.print_job
    except PrintJob.DoesNotExist:
        return None
    if job.status == PrintJob.Status.PRINTED:
        return job
    job.status = PrintJob.Status.PRINTED
    job.completed_at = timezone.now()
    job.last_error = ''
    job.save(update_fields=['status', 'completed_at', 'last_error', 'updated_at'])
    return job


def queue_counts() -> dict[str, int]:
    from django.db.models import Count

    counts = {s.value: 0 for s in PrintJob.Status}
    for row in PrintJob.objects.values('status').annotate(n=Count('id')):
        counts[row['status']] = row['n']
    counts['awaiting_scan'] = PrintJob.objects.filter(
        status=PrintJob.Status.PRINTED,
        order__scan_pdf__isnull=True,
    ).exclude(order__status=Order.Status.COMPLETED).count()
    return counts


def _normalize_sets_for_ui(sets_json: list) -> list[dict]:
    out = []
    for s in sorted(sets_json or [], key=lambda x: x.get('set_index', 0)):
        nums = s.get('nums') or []
        if len(nums) != 6:
            nums = [s.get(f'n{i}') for i in range(1, 7)]
        try:
            numbers = [int(n) for n in nums if n is not None]
            strong = int(s.get('strong') or 0)
        except (TypeError, ValueError):
            continue
        if len(numbers) != 6:
            continue
        out.append({
            'setIndex': int(s.get('set_index') or len(out) + 1),
            'numbers': numbers,
            'strong': strong,
            'display': s.get('display') or ' '.join(str(n) for n in sorted(numbers)) + f' | {strong}',
        })
    return out


def _forms_from_sets(sets_json: list) -> list[dict]:
    sets = _normalize_sets_for_ui(sets_json)
    forms = []
    for i in range(0, len(sets), 14):
        chunk = sets[i : i + 14]
        forms.append({
            'formIndex': len(forms) + 1,
            'tables': chunk,
        })
    return forms


def skip_job_to_scan(job: PrintJob) -> PrintJob:
    """Mark as printed without physical print — ready for scan_app."""
    if job.status == PrintJob.Status.CANCELLED:
        raise ValueError('לא ניתן לדלג על משימה שבוטלה')
    order = job.order
    if order.status == Order.Status.COMPLETED:
        raise ValueError('ההזמנה כבר הושלמה')
    if order.scan_pdf:
        raise ValueError('כבר קיימת סריקה להזמנה זו')

    now = timezone.now()
    order.status = Order.Status.PRINTED
    order.printed_at = order.printed_at or now
    order.save(update_fields=['status', 'printed_at'])

    job.status = PrintJob.Status.PRINTED
    job.completed_at = now
    job.last_error = ''
    job.save(update_fields=['status', 'completed_at', 'last_error', 'updated_at'])
    return job


def job_to_dict(job: PrintJob, *, include_payload: bool = False) -> dict:
    order = job.order
    customer = order.customer
    sets = _normalize_sets_for_ui(order.sets_json)
    forms = _forms_from_sets(order.sets_json)
    data = {
        'id': job.id,
        'orderId': order.id,
        'orderNumber': order.order_number,
        'status': job.status,
        'priority': job.priority,
        'attempts': job.attempts,
        'maxAttempts': job.max_attempts,
        'lastError': job.last_error or None,
        'tablesCount': order.forms_count,
        'formsCount': len(forms) or 1,
        'totalIls': float(order.amount_ils),
        'drawDate': order.draw_name or '',
        'isDouble': bool(order.is_double),
        'lotteryId': order.lottery_id,
        'orderStatus': order.status,
        'claimedByAgent': job.claimed_by_agent or None,
        'approvedAt': job.approved_at.isoformat() if job.approved_at else None,
        'claimedAt': job.claimed_at.isoformat() if job.claimed_at else None,
        'completedAt': job.completed_at.isoformat() if job.completed_at else None,
        'createdAt': job.created_at.isoformat(),
        'orderCreatedAt': order.created_at.isoformat(),
        'orderPrintedAt': order.printed_at.isoformat() if order.printed_at else None,
        'orderScannedAt': order.scanned_at.isoformat() if order.scanned_at else None,
        'hasScan': bool(order.scan_pdf),
        'sets': sets,
        'forms': forms,
        'user': {
            'name': customer.display_name,
            'phone': customer.phone,
            'email': customer.email,
        },
    }
    if include_payload:
        data['payload'] = job.payload_json or build_job_payload(order)
    return data
