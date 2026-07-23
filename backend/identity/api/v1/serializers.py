from rest_framework import serializers


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=10, write_only=True)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    tenant_name = serializers.CharField(max_length=255)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class GoogleLoginCompleteSerializer(serializers.Serializer):
    ticket = serializers.CharField(max_length=128, required=False, allow_blank=True)
    code = serializers.CharField(max_length=2048, required=False, allow_blank=True)
    state = serializers.CharField(max_length=128, required=False, allow_blank=True)

    def validate(self, attrs):
        ticket = (attrs.get("ticket") or "").strip()
        code = (attrs.get("code") or "").strip()
        state = (attrs.get("state") or "").strip()
        if ticket:
            attrs["ticket"] = ticket
            attrs.pop("code", None)
            attrs.pop("state", None)
            return attrs
        if code and state:
            attrs["code"] = code
            attrs["state"] = state
            attrs.pop("ticket", None)
            return attrs
        raise serializers.ValidationError("Provide ticket, or code and state.")


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.CharField()


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(min_length=10, write_only=True)


class InviteUserSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    role_slug = serializers.CharField(max_length=100, default="read_only")


class UpdateMeSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100, required=False)
    last_name = serializers.CharField(max_length=100, required=False)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    preferred_locale = serializers.CharField(max_length=10, required=False)


class UpdateUserSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100, required=False)
    last_name = serializers.CharField(max_length=100, required=False)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    preferred_locale = serializers.CharField(max_length=10, required=False)
    is_active = serializers.BooleanField(required=False)
