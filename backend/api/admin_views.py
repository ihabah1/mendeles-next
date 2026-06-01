"""Admin dashboard API for staff users authenticated via JWT."""
from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from admin_panel.accounts.models import User
from admin_panel.portal.models import Order


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
                'user': {
                    'name': customer.display_name,
                    'phone': customer.phone,
                    'email': customer.email,
                },
            })
        return Response({'orders': orders, 'count': len(orders)})

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
