"""DRF serializers exposing the existing Django models to the React frontend."""
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from admin_panel.portal.models import (
    ActionLog,
    CreditAccount,
    CustomerMessage,
    CustomerPermission,
    CustomerProfile,
    Order,
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Public-facing representation of an authenticated user."""

    display_name = serializers.CharField(read_only=True)
    is_admin = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'phone', 'role', 'is_active', 'is_staff', 'date_joined',
            'display_name', 'is_admin',
        )
        read_only_fields = ('id', 'role', 'is_active', 'is_staff', 'date_joined')


class RegisterSerializer(serializers.ModelSerializer):
    """Self-service registration -> creates a CUSTOMER user."""

    password = serializers.CharField(write_only=True, min_length=4, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'first_name', 'last_name', 'phone')

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('כתובת אימייל זו כבר רשומה.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.sync_full_name()
        user.save()
        return user


class LoginTokenSerializer(TokenObtainPairSerializer):
    """JWT login that also returns the serialized user object."""

    username_field = User.USERNAME_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['role'] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


# ── Portal model serializers ─────────────────────────────────────────────────
class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = '__all__'


class OrderSerializer(serializers.ModelSerializer):
    customer_email = serializers.EmailField(source='customer.email', read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'customer', 'customer_email', 'order_number', 'draw_name',
            'forms_count', 'amount_ils', 'table_price_ils', 'commission_ils',
            'sets_json', 'is_double', 'lottery_id', 'status', 'created_at',
        )
        read_only_fields = ('id', 'created_at', 'customer_email')


class CreditAccountSerializer(serializers.ModelSerializer):
    masked_card = serializers.SerializerMethodField()

    def get_masked_card(self, obj) -> str:
        return obj.masked_card()

    class Meta:
        model = CreditAccount
        fields = (
            'id', 'customer', 'card_last4', 'card_brand', 'card_holder',
            'expiry_month', 'expiry_year', 'balance_ils', 'total_topup_ils',
            'total_charge_ils', 'is_verified', 'updated_at', 'masked_card',
        )
        read_only_fields = ('id', 'updated_at', 'masked_card')


class CustomerMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerMessage
        fields = '__all__'


class ActionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActionLog
        fields = '__all__'


class CustomerPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerPermission
        fields = '__all__'
