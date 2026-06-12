"""Admin dashboard API for staff users authenticated via JWT."""
from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from admin_panel.accounts.models import User
from admin_panel.portal.models import IntegrationLog, Order, Subscription

from api.services.icount_service import (
    fetch_document_pdf_link,
    icount_config_status,
    issue_invoice_if_needed,
)
from api.services.integration_log import log_integration, recent_integration_logs
from api.services.lotto_wins import check_and_credit_wins
from api.services.order_search import apply_order_doc_filters, apply_order_search
from api.services.print_queue_service import _forms_from_sets
from api.services.pais_draw import fetch_and_save_draw, read_draw_data
from api.services.print_queue_service import approve_job, enqueue_order, job_to_dict
from api.services.print_service import print_configured
from api.staff_permissions import IsStaffPortalUser

IsStaffUser = IsStaffPortalUser


def _managed_users():
    return User.objects.exclude(email__iexact=settings.ADMIN_EMAIL).filter(
        role__in=[User.Role.CUSTOMER, User.Role.TEAM],
    )


@api_view(['GET'])
@permission_classes([IsStaffUser])
def admin_stats(request):
    today = timezone.localdate()
    orders = Order.objects.all()
    revenue = orders.aggregate(total=Sum('amount_ils'))['total'] or 0
    return Response({
        'total_users': _managed_users().count(),
        'new_today': _managed_users().filter(date_joined__date=today).count(),
        'active_subs': Subscription.objects.filter(
            status='active',
            expires_at__gt=timezone.now(),
        ).count(),
        'pending_orders': orders.filter(status=Order.Status.PENDING).count(),
        'total_revenue': float(revenue),
        'total_wins': 0,
        'total_prize': 0,
    })


@api_view(['GET', 'PATCH'])
@permission_classes([IsStaffUser])
def admin_orders(request):
    if request.method == 'GET':
        status_filter = request.query_params.get('status', '').strip()
        search_q = (
            request.query_params.get('q', '')
            or request.query_params.get('search', '')
        ).strip()
        qs = Order.objects.select_related('customer').order_by('-created_at')
        if status_filter == 'scanned':
            qs = qs.exclude(scan_pdf__isnull=True).exclude(scan_pdf=b'')
        elif status_filter:
            qs = qs.filter(status=status_filter)
        qs = apply_order_search(qs, search_q)
        qs = apply_order_doc_filters(
            qs,
            has_scan=request.query_params.get('has_scan'),
            has_invoice=request.query_params.get('has_invoice'),
        )
        qs = qs[:500]
        orders = []
        for o in qs:
            customer = o.customer
            orders.append({
                'id': o.id,
                'orderNumber': o.order_number,
                'tablesCount': o.forms_count,
                'totalIls': float(o.amount_ils),
                'status': o.status,
                'drawDate': o.draw_name or '',
                'createdAt': o.created_at.isoformat(),
                'icountDocNumber': o.icount_doc_number or None,
                'icountPdfLink': o.icount_pdf_link or None,
                'icountDocId': o.icount_doc_id or None,
                'invoiceIssuedAt': o.invoice_issued_at.isoformat() if o.invoice_issued_at else None,
                'printedAt': o.printed_at.isoformat() if o.printed_at else None,
                'scannedAt': o.scanned_at.isoformat() if o.scanned_at else None,
                'hasScan': bool(o.scan_pdf),
                'user': {
                    'name': customer.display_name,
                    'phone': customer.phone,
                    'email': customer.email,
                    'username': customer.username or None,
                },
            })
        return Response({
            'orders': orders,
            'count': len(orders),
            'integrations': {
                'icount': icount_config_status(),
                'print': {'configured': print_configured()},
            },
            'logs': recent_integration_logs(limit=30),
        })

    order_id = request.data.get('order_id')
    new_status = request.data.get('status')
    valid = {c.value for c in Order.Status}
    if not order_id or new_status not in valid:
        return Response({'error': 'סטטוס לא תקין'}, status=status.HTTP_400_BAD_REQUEST)
    order = Order.objects.filter(pk=order_id).first()
    if not order:
        return Response({'error': 'הזמנה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)
    order.status = new_status
    order.save(update_fields=['status'])
    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([IsStaffUser])
def admin_order_form_preview(request, order_id: int):
    """GET /api/admin/orders/<id>/form-preview/ — marked lotto tables for staff UI."""
    order = Order.objects.select_related('customer').filter(pk=order_id).first()
    if not order:
        return Response({'error': 'הזמנה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)

    customer = order.customer
    return Response({
        'orderId': order.id,
        'orderNumber': order.order_number,
        'forms': _forms_from_sets(order.sets_json),
        'drawDate': order.draw_name or '',
        'isDouble': bool(order.is_double),
        'lotteryId': order.lottery_id,
        'tablesCount': order.forms_count,
        'customerName': customer.display_name,
        'user': {
            'name': customer.display_name,
            'phone': customer.phone,
            'email': customer.email,
        },
    })


@api_view(['GET'])
@permission_classes([IsStaffUser])
def admin_integration_logs(request):
    source = request.query_params.get('source', '').strip()
    try:
        limit = min(int(request.query_params.get('limit', 80)), 200)
    except (TypeError, ValueError):
        limit = 80
    return Response({
        'logs': recent_integration_logs(source=source, limit=limit),
        'integrations': {
            'icount': icount_config_status(),
            'print': {'configured': print_configured()},
        },
    })


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_order_print(request, order_id):
    """Approve order for print queue — local agent pulls when online."""
    order = Order.objects.select_related('customer').filter(pk=order_id).first()
    if not order:
        return Response({'error': 'הזמנה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)

    job = enqueue_order(order)
    approve_job(job, request.user)
    log_integration(
        IntegrationLog.Source.PRINT,
        IntegrationLog.Level.INFO,
        f'אושר לתור הדפסה: {order.order_number}',
        order=order,
    )
    tables_count = len(order.sets_json or [])
    return Response({
        'detail': (
            f'ההזמנה {order.order_number} אושרה לתור הדפסה — '
            f'סוכן המדפסת ימשוך כשמחובר'
        ),
        'order_number': order.order_number,
        'tables_count': tables_count,
        'printer_confirmed': False,
        'queued': True,
        'job': job_to_dict(job),
    })


@api_view(['GET', 'POST'])
@permission_classes([IsStaffUser])
def admin_order_invoice(request, order_id):
    """GET: invoice links. POST: issue iCount invoice for order."""
    order = Order.objects.select_related('customer').filter(pk=order_id).first()
    if not order:
        return Response({'error': 'הזמנה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        issue_invoice_if_needed(order, trigger='admin_view')
        order.refresh_from_db()

        doc_number = (order.icount_doc_number or '').strip()
        doc_id = (order.icount_doc_id or '').strip()
        pdf_link = (order.icount_pdf_link or '').strip()

        if not doc_number and not doc_id and not pdf_link:
            return Response(
                {
                    'detail': 'טרם הונפקה חשבונית להזמנה זו',
                    'can_issue': True,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if not pdf_link and (doc_id or doc_number):
            fetched = fetch_document_pdf_link(doc_id=doc_id, doc_number=doc_number)
            if fetched:
                pdf_link = fetched
                order.icount_pdf_link = fetched[:512]
                if fetched and not order.invoice_issued_at:
                    order.invoice_issued_at = timezone.now()
                order.save(update_fields=['icount_pdf_link', 'invoice_issued_at'])

        return Response({
            'doc_number': doc_number or None,
            'doc_id': doc_id or None,
            'pdf_link': pdf_link or None,
            'invoice_issued_at': (
                order.invoice_issued_at.isoformat() if order.invoice_issued_at else None
            ),
        })

    inv = issue_invoice_if_needed(order, trigger='admin_manual')
    if inv and inv.get('already_issued'):
        return Response({
            'detail': 'חשבונית כבר הונפקה',
            'doc_number': order.icount_doc_number,
            'doc_id': order.icount_doc_id,
            'pdf_link': order.icount_pdf_link or None,
        })
    if not inv:
        return Response(
            {'detail': 'הנפקת חשבונית נכשלה — ראה יומן אינטגרציות'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    order.refresh_from_db()
    return Response({
        'detail': 'חשבונית הונפקה בהצלחה',
        'doc_number': order.icount_doc_number,
        'doc_id': order.icount_doc_id,
        'pdf_link': order.icount_pdf_link or None,
        'invoice_issued_at': order.invoice_issued_at.isoformat(),
    })


@api_view(['GET'])
@permission_classes([IsStaffUser])
def admin_draw_status(request):
    """GET /api/admin/draw/ — last saved PAIS draw (staff)."""
    data = read_draw_data()
    if not data:
        return Response({'last_draw': None, 'prizes': None, 'updated_at': None})
    return Response(data)


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_refresh_draw(request):
    """POST /api/admin/draw/refresh/ — scrape pais.co.il and save draw_results.json."""
    lottery_id = request.data.get('lottery_id')
    try:
        result = fetch_and_save_draw(lottery_id)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        return Response({'error': f'שגיאה בטעינה מפיס: {exc}'}, status=status.HTTP_502_BAD_GATEWAY)
    return Response({
        'detail': f'הגרלה {result["last_draw"]["lottery_id"]} עודכנה מפיס',
        **result,
    })


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_check_wins(request):
    """POST /api/admin/lotto/check-wins/ — credit wallets for winning sets."""
    dry_run = bool(request.data.get('dry_run', False))
    draw_data = read_draw_data()
    if not draw_data:
        return Response(
            {'error': 'אין נתוני הגרלה — רענן מפיס קודם'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        result = check_and_credit_wins(draw_data, dry_run=dry_run)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(result)
