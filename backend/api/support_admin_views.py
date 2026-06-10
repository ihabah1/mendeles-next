"""Staff API — site chat support requests from customers."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from admin_panel.portal.models import ActionLog

from api.staff_permissions import IsStaffPortalUser

IsStaffUser = IsStaffPortalUser


@api_view(['GET'])
@permission_classes([IsStaffUser])
def support_requests_list(request):
    try:
        limit = min(int(request.query_params.get('limit', 30)), 100)
    except (TypeError, ValueError):
        limit = 30

    logs = (
        ActionLog.objects.filter(event='support.chat_request')
        .select_related('customer')
        .order_by('-created_at')[:limit]
    )
    items = []
    for log in logs:
        customer = log.customer
        items.append({
            'id': log.id,
            'createdAt': log.created_at.isoformat(),
            'customerName': (
                customer.display_name or customer.full_name or customer.email
                if customer
                else 'אורח'
            ),
            'customerEmail': customer.email if customer else '',
            'customerPhone': customer.phone if customer else '',
            'details': log.details,
            'ipAddress': log.ip_address,
        })
    return Response({'requests': items, 'count': len(items)})
