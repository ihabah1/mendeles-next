"""
Print + scan workflow API (x-api-key / kiosk apiKey).

Flow (booth software):
  1. Admin POST /api/print/push → local PRINT_SERVER_URL → booth main screen
  2. Booth prints locally, scans, POST /api/print/complete → completed + PDF
  Legacy: confirm + scan as separate steps.
"""
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from admin_panel.portal.models import IntegrationLog, Order, PrintJob

from api.services.integration_log import log_integration
from api.services.print_auth import authenticate_print_client, print_api_key_header
from api.services.print_service import build_print_forms
from api.staff import is_staff_portal_user
from api.staff_permissions import IsStaffPortalUser

IsStaffUser = IsStaffPortalUser


def _check_print_api_key(request) -> bool:
    ok, _kiosk = authenticate_print_client(request)
    return ok


def _require_print_key(request):
    ok, _kiosk = authenticate_print_client(request)
    if not ok:
        return Response(
            {
                'error': 'אין הרשאה',
                'detail': f'נדרש {print_api_key_header()} תקין (PRINT_API_KEY / PRINTER_KEY / apiKey דוכן)',
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )
    return None


def _order_payload(o: Order) -> dict:
    customer = o.customer
    return {
        'id': o.id,
        'orderId': o.id,
        'orderNumber': o.order_number,
        'userId': o.customer_id,
        'userName': customer.display_name if hasattr(customer, 'display_name') else customer.email,
        'name': customer.display_name if hasattr(customer, 'display_name') else customer.email,
        'phone': getattr(customer, 'phone', None) or '',
        'tablesCount': o.forms_count,
        'totalIls': float(o.amount_ils),
        'drawName': o.draw_name or '',
        'status': o.status,
        'forms': build_print_forms(o.sets_json or []),
        'printedAt': o.printed_at.isoformat() if o.printed_at else None,
        'scannedAt': o.scanned_at.isoformat() if o.scanned_at else None,
        'hasScan': bool(o.scan_pdf),
        'createdAt': o.created_at.isoformat(),
    }


def _orders_awaiting_scan():
    """Same rules as admin print-queue filter «ממתין לסריקה»."""
    return (
        Order.objects.select_related('customer')
        .filter(
            Q(print_job__status=PrintJob.Status.PRINTED)
            | Q(status=Order.Status.PRINTED),
        )
        .filter(Q(scan_pdf__isnull=True) | Q(scan_pdf=b''))
        .exclude(status=Order.Status.COMPLETED)
        .order_by('-printed_at', '-created_at')
        .distinct()[:100]
    )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def print_orders_list(request):
    """GET /api/print/orders/?status=awaiting_scan — for local scan app."""
    denied = _require_print_key(request)
    if denied:
        return denied

    status_filter = (request.query_params.get('status') or 'awaiting_scan').strip()
    valid = {c.value for c in Order.Status}
    special = {'awaiting_scan', 'printed_pending_scan'}

    if status_filter in special:
        qs = _orders_awaiting_scan()
    elif status_filter in valid:
        qs = (
            Order.objects.select_related('customer')
            .filter(status=status_filter)
            .order_by('-printed_at', '-created_at')[:100]
        )
    else:
        return Response({'error': 'סטטוס לא תקין'}, status=status.HTTP_400_BAD_REQUEST)

    return Response([_order_payload(o) for o in qs])


@api_view(['POST'])
@permission_classes([IsStaffUser])
def print_push(request):
    """
    POST /api/print/push — staff pushes order to booth software (PRINT_SERVER_URL).
    Body: { orderId } or { order_id } or { orderNumber }.
    """
    from api.services.print_queue_service import job_to_dict, push_order_to_print_server
    from api.services.print_service import PrintError, print_success_detail

    order_id = request.data.get('orderId') or request.data.get('order_id')
    order_number = (request.data.get('orderNumber') or request.data.get('order_number') or '').strip()

    order = None
    if order_id:
        order = Order.objects.select_related('customer').filter(pk=order_id).first()
    elif order_number:
        order = Order.objects.select_related('customer').filter(order_number__iexact=order_number).first()

    if not order:
        return Response({'error': 'הזמנה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)

    if order.status == Order.Status.COMPLETED:
        return Response({'error': 'ההזמנה כבר הושלמה'}, status=status.HTTP_400_BAD_REQUEST)
    if order.status == Order.Status.CANCELLED:
        return Response({'error': 'ההזמנה בוטלה'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        result = push_order_to_print_server(order, user=request.user)
    except PrintError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    job = result['job']
    pushed = result['pushed']
    detail = print_success_detail(
        tables_count=result['tablesCount'],
        order_number=order.order_number,
        result=result.get('printerResponse'),
    )
    if not pushed and result.get('pushError'):
        detail = f'{order.order_number} בתור — {result["pushError"]}'

    log_integration(
        IntegrationLog.Source.PRINT,
        IntegrationLog.Level.INFO if pushed else IntegrationLog.Level.WARNING,
        f'push לדוכן: {order.order_number}' + (' ✓' if pushed else f' — {result.get("pushError", "")}'),
        order=order,
        details={'pushed': pushed},
    )

    return Response({
        'status': 'ok',
        'detail': detail,
        'pushed': pushed,
        'pushError': result.get('pushError'),
        'orderId': order.id,
        'orderNumber': order.order_number,
        'tablesCount': result['tablesCount'],
        'printerConfirmed': bool(
            isinstance(result.get('printerResponse'), dict)
            and (
                result['printerResponse'].get('printed')
                or result['printerResponse'].get('success')
                or result['printerResponse'].get('ok')
            )
        ),
        'job': job_to_dict(job),
        'payload': result.get('payload'),
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def print_complete(request):
    """
    POST /api/print/complete — booth software after scan + confirm.
    Multipart: orderId + file (PDF). Sets status completed and stores scan.
    """
    denied = _require_print_key(request)
    if denied:
        return denied

    order_id = request.data.get('orderId') or request.data.get('order_id')
    upload = request.FILES.get('file') or request.FILES.get('scan')
    if not order_id:
        return Response({'error': 'orderId חסר'}, status=status.HTTP_400_BAD_REQUEST)
    if not upload:
        return Response({'error': 'file חסר (PDF סריקה)'}, status=status.HTTP_400_BAD_REQUEST)

    order = Order.objects.filter(pk=order_id).first()
    if not order:
        return Response({'error': 'הזמנה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)

    pdf_bytes = upload.read()
    if not pdf_bytes:
        return Response({'error': 'קובץ ריק'}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.now()
    if not order.printed_at:
        order.printed_at = now
    order.scan_pdf = pdf_bytes
    order.scanned_at = now
    order.status = Order.Status.COMPLETED
    order.save(update_fields=['scan_pdf', 'scanned_at', 'printed_at', 'status'])

    from api.services.print_queue_service import complete_job_for_order

    complete_job_for_order(order)

    log_integration(
        IntegrationLog.Source.PRINT,
        IntegrationLog.Level.INFO,
        f'הושלם מהדוכן: {order.order_number}',
        order=order,
        details={'bytes': len(pdf_bytes)},
    )
    return Response({
        'status': 'ok',
        'orderId': order.id,
        'orderNumber': order.order_number,
        'completed': True,
        'url': f'/api/print/scan/{order.id}/',
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def print_confirm(request):
    """POST /api/print/confirm/ — print server or scan app marks order as printed."""
    denied = _require_print_key(request)
    if denied:
        return denied

    order_id = request.data.get('orderId') or request.data.get('order_id')
    if not order_id:
        return Response({'error': 'orderId חסר'}, status=status.HTTP_400_BAD_REQUEST)

    order = Order.objects.filter(pk=order_id).first()
    if not order:
        return Response({'error': 'הזמנה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)

    printed_at_raw = request.data.get('printedAt')
    printed_at = timezone.now()
    if printed_at_raw:
        try:
            from django.utils.dateparse import parse_datetime
            parsed = parse_datetime(str(printed_at_raw))
            if parsed:
                printed_at = parsed
        except (TypeError, ValueError):
            pass

    order.status = Order.Status.PRINTED
    order.printed_at = printed_at
    order.save(update_fields=['status', 'printed_at'])

    from api.services.print_queue_service import complete_job_for_order

    complete_job_for_order(order)

    log_integration(
        IntegrationLog.Source.PRINT,
        IntegrationLog.Level.INFO,
        f'אושר הדפסה: {order.order_number}',
        order=order,
    )
    return Response({
        'status': 'ok',
        'orderId': order.id,
        'orderNumber': order.order_number,
        'printedAt': order.printed_at.isoformat(),
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def print_scan_upload(request):
    """POST /api/print/scan/ — multipart: orderId + file → completed + PDF stored."""
    denied = _require_print_key(request)
    if denied:
        return denied

    order_id = request.data.get('orderId') or request.data.get('order_id')
    upload = request.FILES.get('file')
    if not order_id or not upload:
        return Response({'error': 'orderId ו-file חובה'}, status=status.HTTP_400_BAD_REQUEST)

    order = Order.objects.filter(pk=order_id).first()
    if not order:
        return Response({'error': 'הזמנה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)

    pdf_bytes = upload.read()
    if not pdf_bytes:
        return Response({'error': 'קובץ ריק'}, status=status.HTTP_400_BAD_REQUEST)

    order.scan_pdf = pdf_bytes
    order.scanned_at = timezone.now()
    order.status = Order.Status.COMPLETED
    order.save(update_fields=['scan_pdf', 'scanned_at', 'status'])
    log_integration(
        IntegrationLog.Source.PRINT,
        IntegrationLog.Level.INFO,
        f'סריקה הועלתה — הושלם: {order.order_number}',
        order=order,
        details={'bytes': len(pdf_bytes)},
    )
    return Response({
        'status': 'ok',
        'orderId': order.id,
        'orderNumber': order.order_number,
        'url': f'/api/print/scan/{order.id}/',
    })


def _scan_pdf_response(order: Order, filename: str) -> HttpResponse:
    pdf = bytes(order.scan_pdf)
    return HttpResponse(
        pdf,
        content_type='application/pdf',
        headers={
            'Content-Disposition': f'inline; filename="{filename}"',
            'Content-Length': str(len(pdf)),
            'Cache-Control': 'private, max-age=300',
        },
    )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def print_scan_download(request, order_id: int):
    """GET /api/print/scan/<id>/ — API key (scan app) or JWT owner/staff."""
    order = (
        Order.objects.filter(pk=order_id)
        .only('id', 'order_number', 'scan_pdf', 'customer_id')
        .first()
    )
    if not order or not order.scan_pdf:
        return Response({'error': 'לא נמצאה סריקה'}, status=status.HTTP_404_NOT_FOUND)

    if _check_print_api_key(request):
        return _scan_pdf_response(order, f'scan_{order.order_number}.pdf')

    user = request.user
    if user and user.is_authenticated:
        if is_staff_portal_user(user) or order.customer_id == user.id:
            return _scan_pdf_response(order, f'scan_{order.order_number}.pdf')

    return Response({'error': 'אין הרשאה'}, status=status.HTTP_403_FORBIDDEN)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def customer_order_scan(request, order_id: int):
    """GET /api/orders/<id>/scan/ — customer downloads their form scan."""
    order = (
        Order.objects.filter(pk=order_id)
        .only('id', 'order_number', 'scan_pdf', 'customer_id')
        .first()
    )
    if not order or not order.scan_pdf:
        return Response({'error': 'לא נמצאה סריקה'}, status=status.HTTP_404_NOT_FOUND)
    if not is_staff_portal_user(request.user) and order.customer_id != request.user.id:
        return Response({'error': 'אין הרשאה'}, status=status.HTTP_403_FORBIDDEN)
    return _scan_pdf_response(order, f'scan_{order.order_number}.pdf')


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def customer_order_invoice(request, order_id: int):
    """GET /api/orders/<id>/invoice/ — customer invoice link (owner or staff)."""
    from django.utils import timezone

    from api.services.icount_service import fetch_document_pdf_link, issue_invoice_if_needed

    order = Order.objects.filter(pk=order_id).first()
    if not order:
        return Response({'error': 'הזמנה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)
    if not is_staff_portal_user(request.user) and order.customer_id != request.user.id:
        return Response({'error': 'אין הרשאה'}, status=status.HTTP_403_FORBIDDEN)

    issue_invoice_if_needed(order, trigger='customer_view')
    order.refresh_from_db()

    doc_number = (order.icount_doc_number or '').strip()
    doc_id = (order.icount_doc_id or '').strip()
    pdf_link = (order.icount_pdf_link or '').strip()

    if not doc_number and not doc_id and not pdf_link:
        return Response(
            {'detail': 'חשבונית טרם הונפקה להזמנה זו'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not pdf_link and (doc_id or doc_number):
        fetched = fetch_document_pdf_link(doc_id=doc_id, doc_number=doc_number)
        if fetched:
            pdf_link = fetched
            order.icount_pdf_link = fetched[:512]
            if not order.invoice_issued_at:
                order.invoice_issued_at = timezone.now()
            order.save(update_fields=['icount_pdf_link', 'invoice_issued_at'])

    return Response({
        'doc_number': doc_number or None,
        'pdf_link': pdf_link or None,
        'invoice_issued_at': (
            order.invoice_issued_at.isoformat() if order.invoice_issued_at else None
        ),
    })
