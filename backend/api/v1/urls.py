from django.urls import include, path

from audit.api.v1.views import AuditLogListView
from identity.api.v1.urls import urlpatterns as auth_urls
from identity.api.v1.user_views import (
    UserBlockedRegistrationsView,
    UserDetailView,
    UserForceVerifyView,
    UserHubView,
    UserInviteView,
    UserListView,
    UserPurgeByIdView,
    UserPurgeEmailsView,
    UserResendVerificationView,
    UserResetPasswordView,
    UserRoleAssignView,
)
from content.api.v1.urls import urlpatterns as content_urls
from leads.api.v1.urls import urlpatterns as leads_urls
from automation.api.v1.urls import urlpatterns as automation_urls
from seo.api.v1.urls import urlpatterns as seo_urls
from siteconfig.api.v1.views import HealthView, SettingsView
from siteconfig.api.v1.admin_views import AdminOverviewView
from rbac.api.v1.views import PermissionListView, RoleListView

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("auth/", include(auth_urls)),
    path("users/", UserListView.as_view(), name="users-list"),
    path("users/invite/", UserInviteView.as_view(), name="users-invite"),
    path("users/hub/", UserHubView.as_view(), name="users-hub"),
    path("users/blocked-registrations/", UserBlockedRegistrationsView.as_view(), name="users-blocked-registrations"),
    path("users/purge/", UserPurgeEmailsView.as_view(), name="users-purge-emails"),
    path("users/<uuid:user_id>/", UserDetailView.as_view(), name="users-detail"),
    path("users/<uuid:user_id>/reset-password/", UserResetPasswordView.as_view(), name="users-reset-password"),
    path(
        "users/<uuid:user_id>/resend-verification/",
        UserResendVerificationView.as_view(),
        name="users-resend-verification",
    ),
    path("users/<uuid:user_id>/verify-email/", UserForceVerifyView.as_view(), name="users-force-verify"),
    path("users/<uuid:user_id>/purge/", UserPurgeByIdView.as_view(), name="users-purge"),
    path("users/<uuid:user_id>/roles/", UserRoleAssignView.as_view(), name="users-roles"),
    path(
        "users/<uuid:user_id>/roles/<uuid:role_id>/",
        UserRoleAssignView.as_view(),
        name="users-role-remove",
    ),
    path("roles/", RoleListView.as_view(), name="roles-list"),
    path("permissions/", PermissionListView.as_view(), name="permissions-list"),
    path("settings/", SettingsView.as_view(), name="settings"),
    path("admin/overview/", AdminOverviewView.as_view(), name="admin-overview"),
    path("audit-logs/", AuditLogListView.as_view(), name="audit-logs"),
    path("seo/", include(seo_urls)),
    path("content/", include(content_urls)),
    path("leads/", include(leads_urls)),
    path("automation/", include(automation_urls)),
    path("integrations/", include("integrations.api.v1.urls")),
    path("ai-seo/", include("ai_seo.api.v1.urls")),
    path("inbox/", include("identity.api.v1.inbox_urls")),
    path("whatsapp/", include("whatsapp.urls")),
]
