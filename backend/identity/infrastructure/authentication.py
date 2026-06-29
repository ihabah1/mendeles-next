from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication

from core.exceptions.base import UnauthorizedError
from identity.infrastructure.jwt import JWTService

User = get_user_model()


class JWTAuthentication(BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        header = request.headers.get("Authorization", "")
        if not header.startswith(f"{self.keyword} "):
            return None
        token = header[len(self.keyword) + 1 :].strip()
        if not token:
            return None
        payload = JWTService.decode_access_token(token)
        try:
            user = User.objects.get(pk=payload["sub"], deleted_at__isnull=True, is_active=True)
        except User.DoesNotExist as exc:
            raise UnauthorizedError("משתמש לא נמצא") from exc
        request.tenant_id = payload.get("tenant_id") or (
            str(user.default_tenant_id) if user.default_tenant_id else None
        )
        return user, payload
