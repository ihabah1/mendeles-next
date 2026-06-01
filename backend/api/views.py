"""REST API views: JWT auth flow + model viewsets for the React frontend."""
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
