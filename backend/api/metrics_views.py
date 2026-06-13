"""Public metrics ping — lightweight visit counter."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from api.services.guide_chat_store import record_site_visit


def _client_ip(request) -> str:
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR') or 'unknown'


@api_view(['POST'])
@permission_classes([AllowAny])
def metrics_ping(request):
    """POST /api/metrics/ping/ — count page view once per visitor per day."""
    visitor = (request.data.get('visitor_id') or '').strip()[:64] or _client_ip(request)
    record_site_visit(visitor_key=visitor)
    return Response({'ok': True})
