"""Admin dashboard API for staff users authenticated via JWT."""
from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from admin_panel.accounts.models import User
from admin_panel.portal.models import IntegrationLog, Order

from api.services.icount_service import (
    ICountError,
    create_invoice_for_order,
    fetch_document_pdf_link,
    icount_config_status,
)
from api.services.integration_log import log_integration, recent_integration_logs
from api.services.print_service import (
    PrintError,
    print_configured,
    print_success_detail,
    send_order_to_printer,
)


class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


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
        'active_subs': 0,
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
        qs = Order.objects.select_related('customer').order_by('-created_at')[:500]
        if status_filter:
            qs = qs.filter(status=status_filter)
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
                'user': {
                    'name': customer.display_name,
                    'phone': customer.phone,
                    'email': customer.email,
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
    """Send order to external print server (POST /print)."""
    order = Order.objects.select_related('customer').filter(pk=order_id).first()
    if not order:
        return Response({'error': 'הזמנה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)
    log_integration(
        IntegrationLog.Source.PRINT,
        IntegrationLog.Level.INFO,
        f'שליחה להדפסה: {order.order_number}',
        order=order,
    )
    try:
        result = send_order_to_printer(order)
    except PrintError as exc:
        log_integration(
            IntegrationLog.Source.PRINT,
            IntegrationLog.Level.ERROR,
            str(exc),
            order=order,
            details={'order_number': order.order_number},
        )
        return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    order.printed_at = timezone.now()
    printer_ok = isinstance(result, dict) and (result.get('printed') or result.get('success'))
    if printer_ok:
        order.status = Order.Status.PRINTED
    elif order.status in (Order.Status.PAID, Order.Status.PENDING):
        order.status = Order.Status.PRINTING
    order.save(update_fields=['printed_at', 'status'])
    log_integration(
        IntegrationLog.Source.PRINT,
        IntegrationLog.Level.INFO,
        f'הודפס בהצלחה: {order.order_number}',
        order=order,
        details=result if isinstance(result, dict) else {'result': str(result)[:500]},
    )
    tables_count = len(order.sets_json or [])
    return Response({
        'detail': print_success_detail(
            tables_count=tables_count,
            order_number=order.order_number,
            result=result,
        ),
        'order_number': order.order_number,
        'tables_count': tables_count,
        'printer_confirmed': bool(
            isinstance(result, dict) and (result.get('printed') or result.get('success'))
        ),
        'printed_at': order.printed_at.isoformat(),
        'print_response': result,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsStaffUser])
def admin_order_invoice(request, order_id):
    """GET: invoice links. POST: issue iCount invoice for order."""
    order = Order.objects.select_related('customer').filter(pk=order_id).first()
    if not order:
        return Response({'error': 'הזמנה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        doc_number = (order.icount_doc_number or '').strip()
        doc_id = (order.icount_doc_id or '').strip()
        pdf_link = (order.icount_pdf_link or '').strip()

        if not doc_number and not doc_id and not pdf_link:
            return Response(
                {
                    'detail': 'טרם הונפקה חשבונית להזמנה זו — לחץ «הנפק חשבונית»',
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

    if (order.icount_doc_number or '').strip():
        return Response({
            'detail': 'חשבונית כבר הונפקה',
            'doc_number': order.icount_doc_number,
            'doc_id': order.icount_doc_id,
            'pdf_link': order.icount_pdf_link or None,
        })

    log_integration(
        IntegrationLog.Source.ICOUNT,
        IntegrationLog.Level.INFO,
        f'מנסה להנפיק חשבונית: {order.order_number}',
        order=order,
        details={
            'amount_ils': float(order.amount_ils),
            'customer': order.customer.email,
        },
    )

    try:
        inv = create_invoice_for_order(order)
    except ICountError as exc:
        log_integration(
            IntegrationLog.Source.ICOUNT,
            IntegrationLog.Level.ERROR,
            str(exc),
            order=order,
            details={
                'order_number': order.order_number,
                **(exc.details if getattr(exc, 'details', None) else {}),
            },
        )
        return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    doc_number = str(inv.get('doc_number') or '').strip()
    doc_id = str(inv.get('doc_id') or '').strip()
    if not doc_number and not doc_id:
        msg = 'iCount לא החזיר מזהה מסמך — החשבונית לא נשמרה'
        log_integration(
            IntegrationLog.Source.ICOUNT,
            IntegrationLog.Level.ERROR,
            msg,
            order=order,
            details=inv.get('raw'),
        )
        return Response({'detail': msg}, status=status.HTTP_502_BAD_GATEWAY)

    order.icount_doc_id = doc_id
    order.icount_doc_number = doc_number
    order.icount_pdf_link = str(inv.get('pdf_link') or '')[:512]
    order.invoice_issued_at = timezone.now()
    order.save(
        update_fields=[
            'icount_doc_id',
            'icount_doc_number',
            'icount_pdf_link',
            'invoice_issued_at',
        ],
    )

    log_integration(
        IntegrationLog.Source.ICOUNT,
        IntegrationLog.Level.INFO,
        f'חשבונית {doc_number or doc_id} הונפקה: {order.order_number}',
        order=order,
        details={
            'doc_number': doc_number,
            'doc_id': doc_id,
            'pdf_link': order.icount_pdf_link or None,
        },
    )

    return Response({
        'detail': 'חשבונית הונפקה בהצלחה',
        'doc_number': order.icount_doc_number,
        'doc_id': order.icount_doc_id,
        'pdf_link': order.icount_pdf_link or inv.get('pdf_link'),
        'invoice_issued_at': order.invoice_issued_at.isoformat(),
    })
