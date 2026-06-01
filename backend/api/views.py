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
    """POST -> create a customer account and return tokens + user."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        ensure_customer_records(user)
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
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
        user = User(email=email, first_name=first_name[:60])
        user.set_unusable_password()
        user.sync_full_name()
        user.save()
        ensure_customer_records(user)

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
