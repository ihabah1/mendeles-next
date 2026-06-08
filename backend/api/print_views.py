"""
Print + scan workflow API (x-api-key).

Flow:
  1. Admin/lotto sends order to print server → status ``printing``
  2. Print server (or scan app) POST /print/confirm/ → ``printed``
  3. Scan app POST /print/scan/ with PDF → ``completed`` + scan stored
  4. Customer GET /orders/<id>/scan/ (JWT) or /print/scan/<id>/ (API key)
"""
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from admin_panel.portal.models import IntegrationLog, Order

from api.services.integration_log import log_integration


def _print_api_key_header() -> str:
    return getattr(settings, 'PRINT_API_KEY_HEADER', 'x-api-key') or 'x-api-key'


def _check_print_api_key(request) -> bool:
    expected = (getattr(settings, 'PRINT_API_KEY', '') or '').strip()
    if not expected:
        return False
    received = (request.headers.get(_print_api_key_header()) or '').strip()
    return received == expected


def _require_print_key(request):
    if not _check_print_api_key(request):
        return Response({'error': 'אין הרשאה'}, status=status.HTTP_401_UNAUTHORIZED)
    return None


def _order_payload(o: Order) -> dict:
    return {
        'id': o.id,
        'orderNumber': o.order_number,
        'userId': o.customer_id,
        'userName': o.customer.display_name,
        'tablesCount': o.forms_count,
        'totalIls': float(o.amount_ils),
        'status': o.status,
        'printedAt': o.printed_at.isoformat() if o.printed_at else None,
        'scannedAt': o.scanned_at.isoformat() if o.scanned_at else None,
        'hasScan': bool(o.scan_pdf),
        'createdAt': o.created_at.isoformat(),
    }


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def print_orders_list(request):
    """GET /api/print/orders/?status=printed — for local scan app."""
    denied = _require_print_key(request)
    if denied:
        return denied

    status_filter = (request.query_params.get('status') or 'printed').strip()
    valid = {c.value for c in Order.Status}
    if status_filter not in valid:
        return Response({'error': 'סטטוס לא תקין'}, status=status.HTTP_400_BAD_REQUEST)

    qs = (
        Order.objects.select_related('customer')
        .filter(status=status_filter)
        .order_by('-printed_at', '-created_at')[:100]
    )
    return Response([_order_payload(o) for o in qs])


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
    return HttpResponse(
        bytes(order.scan_pdf),
        content_type='application/pdf',
        headers={'Content-Disposition': f'inline; filename="{filename}"'},
    )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def print_scan_download(request, order_id: int):
    """GET /api/print/scan/<id>/ — API key (scan app) or JWT owner/staff."""
    order = Order.objects.select_related('customer').filter(pk=order_id).first()
    if not order or not order.scan_pdf:
        return Response({'error': 'לא נמצאה סריקה'}, status=status.HTTP_404_NOT_FOUND)

    if _check_print_api_key(request):
        return _scan_pdf_response(order, f'scan_{order.order_number}.pdf')

    user = request.user
    if user and user.is_authenticated:
        if user.is_staff or order.customer_id == user.id:
            return _scan_pdf_response(order, f'scan_{order.order_number}.pdf')

    return Response({'error': 'אין הרשאה'}, status=status.HTTP_403_FORBIDDEN)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def customer_order_scan(request, order_id: int):
    """GET /api/orders/<id>/scan/ — customer downloads their form scan."""
    order = Order.objects.filter(pk=order_id).first()
    if not order or not order.scan_pdf:
        return Response({'error': 'לא נמצאה סריקה'}, status=status.HTTP_404_NOT_FOUND)
    if not request.user.is_staff and order.customer_id != request.user.id:
        return Response({'error': 'אין הרשאה'}, status=status.HTTP_403_FORBIDDEN)
    return _scan_pdf_response(order, f'scan_{order.order_number}.pdf')
