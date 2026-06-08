"""DRF serializers exposing the existing Django models to the React frontend."""
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from api.services.phone_verification import firebase_phone_auth_enabled, phone_verification_required_for
from api.services.sms import sms_verification_enabled

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
    phone_number = serializers.CharField(source='phone', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'phone', 'phone_number', 'role', 'is_active', 'is_staff', 'date_joined',
            'display_name', 'is_admin', 'email_verified', 'phone_verified',
        )
        read_only_fields = (
            'id', 'role', 'is_active', 'is_staff', 'date_joined',
            'email_verified', 'phone_verified',
        )


class RegisterSerializer(serializers.ModelSerializer):
    """Self-service registration -> creates a CUSTOMER user."""

    password = serializers.CharField(write_only=True, min_length=4, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'first_name', 'last_name', 'phone')

    def validate_email(self, value):
        value = value.lower().strip()
        if self.instance and self.instance.email.lower() == value:
            return value
        existing = User.objects.filter(email__iexact=value).first()
        if existing:
            if existing.email_verified:
                raise serializers.ValidationError(
                    'כתובת אימייל זו כבר רשומה. התחבר או השתמש ב"שכחתי סיסמה".',
                )
            if not self.instance:
                self.context['existing_unverified_user'] = existing
        return value

    def validate_phone(self, value):
        value = (value or '').strip()
        if sms_verification_enabled() and not firebase_phone_auth_enabled() and not value:
            raise serializers.ValidationError('נדרש מספר טלפון לאימות SMS.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        existing = self.context.get('existing_unverified_user')
        if existing:
            user = existing
            user.first_name = validated_data.get('first_name', '') or user.first_name
            user.last_name = validated_data.get('last_name', '') or user.last_name
            user.phone = validated_data.get('phone', '') or user.phone
        else:
            user = User(**validated_data)
        user.set_password(password)
        user.sync_full_name()
        user.email_verified = False
        user.phone_verified = not phone_verification_required_for(user)
        user.is_active = False
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password')
        instance.first_name = validated_data.get('first_name', instance.first_name) or instance.first_name
        instance.last_name = validated_data.get('last_name', instance.last_name) or instance.last_name
        instance.phone = validated_data.get('phone', instance.phone) or instance.phone
        instance.set_password(password)
        instance.sync_full_name()
        instance.email_verified = False
        instance.phone_verified = not phone_verification_required_for(instance)
        instance.is_active = False
        instance.save()
        return instance


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
        email = (attrs.get(self.username_field) or '').lower().strip()
        password = attrs.get('password', '')
        if email and password:
            try:
                candidate = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                pass
            else:
                if candidate.check_password(password):
                    if not candidate.email_verified or not candidate.is_active:
                        raise serializers.ValidationError(
                            {
                                'detail': 'יש לאמת את כתובת האימייל לפני הכניסה. בדוק את תיבת הדואר.',
                            },
                            code='email_not_verified',
                        )
                    if phone_verification_required_for(candidate) and not candidate.phone_verified:
                        raise serializers.ValidationError(
                            {
                                'detail': 'יש לאמת את מספר הטלפון (קוד SMS) לפני הכניסה.',
                            },
                            code='phone_not_verified',
                        )
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
    has_scan = serializers.SerializerMethodField()
    has_invoice = serializers.SerializerMethodField()
    invoice_doc_number = serializers.CharField(source='icount_doc_number', read_only=True)
    invoice_pdf_link = serializers.URLField(source='icount_pdf_link', read_only=True)
    printed_at = serializers.DateTimeField(read_only=True)
    scanned_at = serializers.DateTimeField(read_only=True)
    invoice_issued_at = serializers.DateTimeField(read_only=True)

    def get_has_scan(self, obj) -> bool:
        return bool(obj.scan_pdf)

    def get_has_invoice(self, obj) -> bool:
        return bool(
            (obj.icount_pdf_link or '').strip()
            or (obj.icount_doc_number or '').strip()
            or obj.invoice_issued_at
        )

    class Meta:
        model = Order
        fields = (
            'id', 'customer', 'customer_email', 'order_number', 'draw_name',
            'forms_count', 'amount_ils', 'table_price_ils', 'commission_ils',
            'sets_json', 'is_double', 'lottery_id', 'status', 'created_at',
            'printed_at', 'scanned_at', 'has_scan',
            'has_invoice', 'invoice_doc_number', 'invoice_pdf_link', 'invoice_issued_at',
        )
        read_only_fields = (
            'id', 'created_at', 'customer_email', 'has_scan', 'has_invoice',
            'invoice_doc_number', 'invoice_pdf_link', 'invoice_issued_at',
            'printed_at', 'scanned_at',
        )


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
