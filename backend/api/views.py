"""REST API views: JWT auth flow + model viewsets for the React frontend."""
import requests
from django.contrib.auth import get_user_model
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import CreateAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from admin_panel.portal.models import (
    ActionLog,
    CreditAccount,
    CustomerMessage,
    CustomerPermission,
    CustomerProfile,
    Order,
)

from .permissions import IsAdminOrOwner, IsStaffOrReadOnlyOwner
from .services.email_verification import (
    frontend_email_proxy_enabled,
    issue_verification_or_delegate,
    resend_for_email,
    verification_payload_for_user,
    verify_token,
)
from .services.firebase_service import firebase_config_status, verify_firebase_id_token
from .services.phone_verification import (
    firebase_phone_auth_enabled,
    issue_phone_otp,
    mark_phone_verified_from_firebase,
    phone_verification_required_for,
    resend_phone_otp,
    verify_phone_code,
)
from .services.sms import normalize_phone
from .services.resend_email import ResendError, resend_config_status
from .services.sms import SmsError, sms_config_status
from .services.user_setup import ensure_customer_records
from .serializers import (
    ActionLogSerializer,
    CreditAccountSerializer,
    CustomerMessageSerializer,
    CustomerPermissionSerializer,
    CustomerProfileSerializer,
    LoginTokenSerializer,
    OrderSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


# ── Authentication ────────────────────────────────────────────────────────────
class LoginView(TokenObtainPairView):
    """POST email + password -> { access, refresh, user }."""

    serializer_class = LoginTokenSerializer
    permission_classes = [permissions.AllowAny]


class RegisterView(CreateAPIView):
    """POST -> create account and send email verification (Resend)."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        import logging

        logger = logging.getLogger(__name__)
        email = (request.data.get('email') or '').strip().lower()
        existing = User.objects.filter(email__iexact=email).first() if email else None

        if existing and existing.email_verified:
            return Response(
                {
                    'email': [
                        'כתובת אימייל זו כבר רשומה. התחבר או השתמש ב"שכחתי סיסמה".',
                    ],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if existing and not existing.email_verified:
            serializer = self.get_serializer(existing, data=request.data)
            created_new = False
        else:
            serializer = self.get_serializer(data=request.data)
            created_new = True

        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        ensure_customer_records(user)
        logger.info('Register endpoint: user=%s re_register=%s', user.email, not created_new)
        try:
            payload = issue_verification_or_delegate(user)
            if phone_verification_required_for(user):
                payload['phone_verification_required'] = True
                payload['firebase_phone_auth'] = firebase_phone_auth_enabled()
                payload['phone'] = user.phone
            if not created_new:
                payload['detail'] = (
                    'החשבון כבר היה קיים ללא אימות אימייל. '
                    + payload.get('detail', 'נשלח שוב אימייל אימות.')
                )
        except ResendError as exc:
            if created_new:
                user.delete()
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(payload, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verify_email_view(request):
    """Activate account from link token; returns JWT."""
    token = (request.data.get('token') or '').strip()
    try:
        user = verify_token(token)
    except ValueError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    phone_required = phone_verification_required_for(user) and not user.phone_verified
    body = {
        'detail': 'האימייל אומת בהצלחה.',
        'user': UserSerializer(user).data,
        'phone_verification_required': phone_required,
        'firebase_phone_auth': firebase_phone_auth_enabled(),
    }
    refresh = RefreshToken.for_user(user)
    body['access'] = str(refresh.access_token)
    body['refresh'] = str(refresh)
    if phone_required:
        if firebase_phone_auth_enabled():
            body['detail'] = 'האימייל אומת. המשך לאימות טלפון (Firebase SMS).'
        else:
            try:
                issue_phone_otp(user)
                body['detail'] = 'האימייל אומת. הזן את קוד ה-SMS שנשלח לטלפון.'
            except SmsError as exc:
                body['detail'] = f'האימייל אומת. {exc}'
    return Response(body, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verification_email_payload(request):
    """Trusted frontend fetches verify URL to send via Resend on Next.js."""
    from api.services.email_proxy_secret import verify_email_proxy_secret

    if not verify_email_proxy_secret(request.headers.get('X-Email-Proxy-Secret')):
        return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'detail': 'נדרש אימייל'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return Response(
            {'detail': 'לא נמצא חשבון עם אימייל זה — השלם הרשמה או הירשם מחדש.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    if user.email_verified:
        return Response({'detail': 'כבר מאומת'}, status=status.HTTP_400_BAD_REQUEST)

    payload = verification_payload_for_user(user)
    return Response(payload)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def email_service_status(request):
    """Check Resend configuration (no secrets exposed)."""
    import os

    from django.conf import settings as dj_settings

    from api.services.email_proxy_secret import get_email_proxy_secret
    from api.services.email_verification import can_delegate_email_to_frontend

    status = resend_config_status()
    proxy_ok = frontend_email_proxy_enabled()
    delegate_ok = can_delegate_email_to_frontend()
    env_key = bool(os.getenv('RESEND_API_KEY', '').strip())
    env_from = bool(os.getenv('RESEND_FROM_EMAIL', '').strip())
    if status['configured']:
        send_path = 'backend'
    elif delegate_ok:
        send_path = 'frontend'
    else:
        send_path = 'none'
    return Response(
        {
            **status,
            'env_has_api_key': env_key,
            'env_has_from_email': env_from,
            'frontend_url_set': bool(getattr(dj_settings, 'FRONTEND_URL', '').strip()),
            'send_path': send_path,
            'frontend_delegate': delegate_ok,
            'frontend_proxy': proxy_ok,
            'proxy_secret_ready': bool(get_email_proxy_secret()),
            'register_inline_payload': delegate_ok,
            'hint': None
            if status['configured'] or delegate_ok
            else 'Backend: RESEND_* + FRONTEND_URL — or Frontend: RESEND_* + FRONTEND_URL on Backend',
        },
    )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def resend_verification_view(request):
    """Resend verification email (always 200 to avoid email enumeration)."""
    email = (request.data.get('email') or '').strip()
    if not email:
        return Response({'detail': 'נדרש אימייל'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        resend_for_email(email)
    except ResendError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response(
        {'detail': 'אם החשבון קיים וטרם אומת — נשלח אימייל אימות.'},
        status=status.HTTP_200_OK,
    )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def sms_service_status(request):
    """SMS OTP configuration (no secrets)."""
    return Response(sms_config_status())


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def send_phone_otp_view(request):
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'detail': 'נדרש אימייל'}, status=status.HTTP_400_BAD_REQUEST)
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return Response(
            {'detail': 'לא נמצא חשבון עם אימייל זה.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    if not phone_verification_required_for(user) or user.phone_verified:
        return Response({'detail': 'אימות טלפון לא נדרש'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        payload = issue_phone_otp(user)
    except SmsError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response(payload)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verify_phone_view(request):
    email = (request.data.get('email') or '').strip().lower()
    code = (request.data.get('code') or '').strip()
    try:
        user = verify_phone_code(email=email, code=code)
    except ValueError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    refresh = RefreshToken.for_user(user)
    return Response(
        {
            'detail': 'הטלפון אומת בהצלחה.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def firebase_auth_status(request):
    return Response(firebase_config_status())


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def phone_verification_status_view(request):
    from api.services.phone_verification import phone_verification_status

    return Response(phone_verification_status())


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def firebase_verify_phone_view(request):
    """Verify Firebase Phone Auth ID token; mark phone_verified on the JWT user."""
    firebase_token = (request.data.get('firebase_token') or '').strip()
    try:
        claims = verify_firebase_id_token(firebase_token)
    except ValueError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if not user.email_verified:
        return Response(
            {'detail': 'יש לאמת אימייל לפני אימות טלפון.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        phone_e164 = normalize_phone(claims['phone_number'])
    except Exception:
        phone_e164 = claims['phone_number']

    mark_phone_verified_from_firebase(user, phone_e164=phone_e164)
    refresh = RefreshToken.for_user(user)
    return Response(
        {
            'detail': 'הטלפון אומת בהצלחה.',
            'phone_number': user.phone,
            'phone_verified': True,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def resend_phone_otp_view(request):
    email = (request.data.get('email') or '').strip()
    if not email:
        return Response({'detail': 'נדרש אימייל'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        resend_phone_otp(email)
    except SmsError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response(
        {'detail': 'אם החשבון קיים — נשלח קוד SMS.'},
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """Blacklist the supplied refresh token so it can no longer be used."""
    refresh = request.data.get('refresh')
    if not refresh:
        return Response({'detail': 'refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        RefreshToken(refresh).blacklist()
    except TokenError:
        return Response({'detail': 'invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
    return Response(status=status.HTTP_205_RESET_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def google_login(request):
    """Verify a Google access token and return Django JWT (login or register)."""
    access_token = (request.data.get('access_token') or '').strip()
    if not access_token:
        return Response({'detail': 'access_token required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        ui_res = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10,
        )
        ui_res.raise_for_status()
        ui = ui_res.json()
    except requests.RequestException:
        return Response({'detail': 'Google token invalid'}, status=status.HTTP_400_BAD_REQUEST)

    email = (ui.get('email') or '').lower().strip()
    if not email:
        return Response({'detail': 'Google account has no email'}, status=status.HTTP_400_BAD_REQUEST)
    if ui.get('email_verified') is False:
        return Response({'detail': 'Google email not verified'}, status=status.HTTP_400_BAD_REQUEST)

    name = (ui.get('name') or '').strip()
    first_name = name.split()[0] if name else ''

    user = User.objects.filter(email__iexact=email).first()
    if not user:
        user = User(
            email=email,
            first_name=first_name[:60],
            email_verified=True,
            is_active=True,
        )
        user.set_unusable_password()
        user.sync_full_name()
        user.save()
        ensure_customer_records(user)
    elif not user.email_verified:
        user.email_verified = True
        user.is_active = True
        user.save(update_fields=['email_verified', 'is_active'])

    refresh = RefreshToken.for_user(user)
    return Response(
        {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        },
        status=status.HTTP_200_OK,
    )


class MeView(RetrieveUpdateAPIView):
    """GET / PATCH the currently authenticated user."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        user = serializer.save()
        user.sync_full_name()
        user.save(update_fields=['full_name'])


# ── Model viewsets ─────────────────────────────────────────────────────────────
class UserViewSet(viewsets.ModelViewSet):
    """Admin-only user management."""

    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


class OrderViewSet(viewsets.ModelViewSet):
    """Customers see their own orders; staff see everything."""

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrOwner]
    owner_field = 'customer'

    def get_queryset(self):
        user = self.request.user
        qs = Order.objects.select_related('customer')
        if user.is_staff:
            return qs
        return qs.filter(customer=user)

    def perform_create(self, serializer):
        if self.request.user.is_staff and serializer.validated_data.get('customer'):
            serializer.save()
        else:
            serializer.save(customer=self.request.user)


class CustomerProfileViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrReadOnlyOwner]
    owner_field = 'user'

    def get_queryset(self):
        user = self.request.user
        qs = CustomerProfile.objects.select_related('user')
        return qs if user.is_staff else qs.filter(user=user)


class CreditAccountViewSet(viewsets.ModelViewSet):
    serializer_class = CreditAccountSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrReadOnlyOwner]
    owner_field = 'customer'

    def get_queryset(self):
        user = self.request.user
        qs = CreditAccount.objects.select_related('customer')
        return qs if user.is_staff else qs.filter(customer=user)


class CustomerMessageViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerMessageSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrOwner]
    owner_field = 'customer'

    def get_queryset(self):
        user = self.request.user
        qs = CustomerMessage.objects.select_related('customer')
        return qs if user.is_staff else qs.filter(customer=user)


class ActionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Audit trail -- staff only."""

    queryset = ActionLog.objects.all()
    serializer_class = ActionLogSerializer
    permission_classes = [permissions.IsAdminUser]


class CustomerPermissionViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerPermissionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrOwner]
    owner_field = 'customer'

    def get_queryset(self):
        user = self.request.user
        qs = CustomerPermission.objects.select_related('customer')
        return qs if user.is_staff else qs.filter(customer=user)
