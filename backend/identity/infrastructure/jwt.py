import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings
from django.utils import timezone as dj_timezone

from core.exceptions.base import UnauthorizedError, ValidationError
from identity.infrastructure.models import RefreshToken, User


class JWTService:
    @staticmethod
    def create_access_token(user: User, tenant_id) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user.id),
            "tenant_id": str(tenant_id) if tenant_id else None,
            "email": user.email,
            "is_superuser": user.is_superuser,
            "iat": now,
            "exp": now + settings.JWT_ACCESS_TTL,
            "jti": str(uuid.uuid4()),
            "type": "access",
        }
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    @staticmethod
    def decode_access_token(token: str) -> dict:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.PyJWTError as exc:
            raise UnauthorizedError("אסימון לא תקין או שפג תוקפו") from exc
        if payload.get("type") != "access":
            raise UnauthorizedError("סוג אסימון לא תקין")
        return payload

    @staticmethod
    def create_refresh_token(user: User, *, ip_address: str | None, user_agent: str) -> tuple[str, RefreshToken]:
        jti = secrets.token_urlsafe(32)
        expires_at = dj_timezone.now() + settings.JWT_REFRESH_TTL
        record = RefreshToken.objects.create(
            user=user,
            jti=jti,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent[:500],
        )
        now = datetime.now(timezone.utc)
        token = jwt.encode(
            {
                "sub": str(user.id),
                "jti": jti,
                "iat": now,
                "exp": now + settings.JWT_REFRESH_TTL,
                "type": "refresh",
            },
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
        return token, record

    @staticmethod
    def decode_refresh_token(token: str) -> dict:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.PyJWTError as exc:
            raise UnauthorizedError("אסימון רענון לא תקין") from exc
        if payload.get("type") != "refresh":
            raise UnauthorizedError("סוג אסימון לא תקין")
        return payload

    @staticmethod
    def rotate_refresh_token(old_jti: str, user: User, *, ip_address, user_agent) -> tuple[str, RefreshToken]:
        old = RefreshToken.objects.filter(jti=old_jti, user=user).first()
        if not old or not old.is_valid:
            raise UnauthorizedError("אסימון רענון לא תקף")
        new_token, new_record = JWTService.create_refresh_token(user, ip_address=ip_address, user_agent=user_agent)
        old.revoked_at = dj_timezone.now()
        old.replaced_by_jti = new_record.jti
        old.save(update_fields=["revoked_at", "replaced_by_jti"])
        return new_token, new_record

    @staticmethod
    def revoke_refresh_token(jti: str, user: User | None = None) -> None:
        qs = RefreshToken.objects.filter(jti=jti, revoked_at__isnull=True)
        if user:
            qs = qs.filter(user=user)
        qs.update(revoked_at=dj_timezone.now())


class TokenHasher:
    @staticmethod
    def hash_token(raw: str) -> str:
        return hashlib.sha256(raw.encode()).hexdigest()

    @staticmethod
    def generate_raw_token() -> str:
        return secrets.token_urlsafe(48)
