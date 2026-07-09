from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions.base import HasPermission
from core.ratelimit import enforce_rate_limit
from identity.api.cookies import clear_refresh_cookie, get_refresh_from_request, set_refresh_cookie
from identity.api.v1.serializers import (
    ForgotPasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    ResendVerificationSerializer,
    ResetPasswordSerializer,
    UpdateMeSerializer,
    VerifyEmailSerializer,
)
from identity.application.auth_service import AuthService


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if blocked := enforce_rate_limit(request, group="auth-register", rate="10/h"):
            return blocked
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, verification_email_sent = AuthService.register(request=request, **serializer.validated_data)
        message = (
            "ההרשמה הצליחה. נשלח אליך אימייל לאימות הכתובת."
            if verification_email_sent
            else "ההרשמה הצליחה. לא הצלחנו לשלוח אימייל אימות כרגע — פנו לתמיכה או נסו שוב מאוחר יותר."
        )
        return Response(
            {
                "message": message,
                "user_id": str(user.id),
                "verification_email_sent": verification_email_sent,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if blocked := enforce_rate_limit(request, group="auth-login", rate="20/m"):
            return blocked
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = AuthService.login(request=request, **serializer.validated_data)
        response = Response(
            {
                "access": result["access"],
                "expires_in": result["expires_in"],
                "user": result["user"],
            }
        )
        set_refresh_cookie(response, result["refresh"])
        return response


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = get_refresh_from_request(request)
        if not token:
            return Response(
                {"error": {"code": "unauthorized", "message": "חסר אסימון רענון", "details": {}}},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        result = AuthService.refresh(refresh_token=token, request=request)
        response = Response({"access": result["access"], "expires_in": result["expires_in"]})
        set_refresh_cookie(response, result["refresh"])
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = get_refresh_from_request(request)
        AuthService.logout(refresh_token=token, user=request.user, request=request)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_refresh_cookie(response)
        return response


class MeView(APIView):
    def get(self, request):
        tenant_id = getattr(request, "tenant_id", None) or request.user.default_tenant_id
        return Response(AuthService.serialize_user(request.user, tenant_id))

    def patch(self, request):
        serializer = UpdateMeSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = AuthService.update_me(
            user=request.user,
            data=serializer.validated_data,
            request=request,
        )
        tenant_id = getattr(request, "tenant_id", None) or user.default_tenant_id
        return Response(AuthService.serialize_user(user, tenant_id))


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        AuthService.verify_email(token=serializer.validated_data["token"], request=request)
        return Response({"message": "האימייל אומת בהצלחה. ניתן להתחבר."})


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if blocked := enforce_rate_limit(request, group="auth-resend-verification", rate="5/h"):
            return blocked
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sent = AuthService.resend_verification(
            email=serializer.validated_data["email"],
            request=request,
        )
        message = (
            "אם האימייל קיים וטרם אומת, נשלח קישור אימות חדש."
            if sent
            else "לא הצלחנו לשלוח אימייל כרגע — נסו שוב מאוחר יותר."
        )
        return Response({"message": message, "verification_email_sent": sent})


class EmailStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        import os

        from django.conf import settings

        from identity.infrastructure import email_config
        from identity.infrastructure.email_config import normalize_from_email, resolve_from_email

        resend_key = bool(os.environ.get("RESEND_API_KEY", "").strip())
        raw_from = os.environ.get("RESEND_FROM_EMAIL", "").strip() or settings.DEFAULT_FROM_EMAIL
        from_email = normalize_from_email(raw_from)
        return Response(
            {
                "configured": resend_key and bool(from_email),
                "backend": settings.EMAIL_BACKEND,
                "from_email": from_email if resend_key else None,
                "from_email_raw": raw_from if resend_key else None,
                "verified_domain": email_config.VERIFIED_FROM_DOMAIN if resend_key else None,
                "frontend_url": settings.FRONTEND_URL,
            }
        )


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if blocked := enforce_rate_limit(request, group="auth-forgot-password", rate="10/h"):
            return blocked
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        AuthService.forgot_password(email=serializer.validated_data["email"], request=request)
        return Response({"message": "אם האימייל קיים במערכת, נשלח קישור לאיפוס סיסמה."})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        AuthService.reset_password(
            token=serializer.validated_data["token"],
            password=serializer.validated_data["password"],
            request=request,
        )
        return Response({"message": "הסיסמה עודכנה בהצלחה."})
