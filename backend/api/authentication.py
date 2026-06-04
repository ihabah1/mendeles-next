"""JWT auth variants for multi-step registration (email → phone)."""
from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.utils import get_md5_hash_password


class JWTAllowInactiveAuthentication(JWTAuthentication):
    """
    Accept JWT for users with is_active=False during phone verification.
    Default JWTAuthentication rejects inactive accounts ("User is inactive").
    """

    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError as exc:
            raise InvalidToken(
                _('Token contained no recognizable user identification')
            ) from exc

        try:
            user = self.user_model.objects.get(**{api_settings.USER_ID_FIELD: user_id})
        except self.user_model.DoesNotExist as exc:
            raise AuthenticationFailed(_('User not found'), code='user_not_found') from exc

        if api_settings.CHECK_REVOKE_TOKEN:
            if validated_token.get(api_settings.REVOKE_TOKEN_CLAIM) != get_md5_hash_password(
                user.password
            ):
                raise AuthenticationFailed(
                    _("The user's password has been changed."), code='password_changed'
                )

        return user
