from django.conf import settings
from django_ratelimit.core import is_ratelimited
from rest_framework import status
from rest_framework.response import Response


def enforce_rate_limit(request, *, group: str, rate: str) -> Response | None:
    if not getattr(settings, "RATELIMIT_ENABLE", True):
        return None
    if is_ratelimited(
        request=request,
        group=group,
        key="ip",
        rate=rate,
        method=request.method,
        increment=True,
    ):
        return Response(
            {
                "error": {
                    "code": "rate_limited",
                    "message": "יותר מדי בקשות. נסה שוב מאוחר יותר.",
                    "details": {},
                }
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )
    return None
