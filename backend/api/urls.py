"""URL routes for the REST API consumed by the React/Next.js frontend."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from . import (
    admin_views,
    ai_compose_views,
    guide_views,
    messages_admin_views,
    lotto_views,
    metrics_views,
    monitoring_views,
    permissions_views,
    print_queue_views,
    print_views,
    service_flag_views,
    support_admin_views,
    views,
    wallet_admin_views,
    wallet_views,
)

router = DefaultRouter()
router.register('users', views.UserViewSet, basename='user')
router.register('orders', views.OrderViewSet, basename='order')
router.register('profiles', views.CustomerProfileViewSet, basename='profile')
router.register('credit-accounts', views.CreditAccountViewSet, basename='creditaccount')
router.register('messages', views.CustomerMessageViewSet, basename='message')
router.register('permissions', views.CustomerPermissionViewSet, basename='permission')
router.register('action-logs', views.ActionLogViewSet, basename='actionlog')

auth_patterns = [
    path('login/', views.LoginView.as_view(), name='auth-login'),
    path('register/', views.RegisterView.as_view(), name='auth-register'),
    path('email-status/', views.email_service_status, name='auth-email-status'),
    path('verification-payload/', views.verification_email_payload, name='auth-verification-payload'),
    path('verify-email/', views.verify_email_view, name='auth-verify-email'),
    path('resend-verification/', views.resend_verification_view, name='auth-resend-verification'),
    path('sms-status/', views.sms_service_status, name='auth-sms-status'),
    path('send-phone-otp/', views.send_phone_otp_view, name='auth-send-phone-otp'),
    path('verify-phone/', views.verify_phone_view, name='auth-verify-phone'),
    path('resend-phone-otp/', views.resend_phone_otp_view, name='auth-resend-phone-otp'),
    path('firebase/verify-phone/', views.firebase_verify_phone_view, name='auth-firebase-verify-phone'),
    path('firebase/status/', views.firebase_auth_status, name='auth-firebase-status'),
    path('phone-verification-status/', views.phone_verification_status_view, name='auth-phone-verification-status'),
    path('google/', views.google_login, name='auth-google'),
    path('logout/', views.logout_view, name='auth-logout'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('verify/', TokenVerifyView.as_view(), name='auth-verify'),
    path('me/', views.MeView.as_view(), name='auth-me'),
    path('change-password/', views.change_password_view, name='auth-change-password'),
]

wallet_patterns = [
    path('balance/', wallet_views.wallet_balance, name='wallet-balance'),
    path('history/', wallet_views.wallet_history, name='wallet-history'),
    path('topup/', wallet_views.wallet_topup, name='wallet-topup'),
]

lotto_patterns = [
    path('draw/', lotto_views.lotto_draw, name='lotto-draw'),
    path('my-sets/', lotto_views.my_sets, name='lotto-my-sets'),
    path('check-combo/', lotto_views.check_combo, name='lotto-check-combo'),
    path('submit/', lotto_views.submit_order, name='lotto-submit'),
    path('subscribe/', lotto_views.subscribe, name='lotto-subscribe'),
    path('print/', lotto_views.print_summary, name='lotto-print'),
]

print_patterns = [
    path('orders/', print_views.print_orders_list, name='print-orders'),
    path('confirm/', print_views.print_confirm, name='print-confirm'),
    path('scan/', print_views.print_scan_upload, name='print-scan-upload'),
    path('scan/<int:order_id>/', print_views.print_scan_download, name='print-scan-download'),
    path('agent/heartbeat/', print_queue_views.print_agent_heartbeat, name='print-agent-heartbeat'),
    path('jobs/pull/', print_queue_views.print_jobs_pull, name='print-jobs-pull'),
    path('jobs/<int:job_id>/fail/', print_queue_views.print_job_fail, name='print-job-fail'),
]

admin_patterns = [
    path('stats/', admin_views.admin_stats, name='admin-stats'),
    path('permissions/users/', permissions_views.permissions_users_list, name='admin-permissions-users'),
    path(
        'permissions/users/bulk-delete/',
        permissions_views.permissions_users_bulk_delete,
        name='admin-permissions-users-bulk-delete',
    ),
    path(
        'permissions/users/<int:user_id>/',
        permissions_views.permissions_user_detail,
        name='admin-permissions-user',
    ),
    path('balance/users/', wallet_admin_views.balance_users_list, name='admin-balance-users'),
    path(
        'balance/users/<int:user_id>/',
        wallet_admin_views.balance_user_detail,
        name='admin-balance-user',
    ),
    path('messages/users/', messages_admin_views.messages_users_list, name='admin-messages-users'),
    path(
        'messages/users/<int:user_id>/',
        messages_admin_views.messages_user_detail,
        name='admin-messages-user',
    ),
    path('ai/text-fix/', ai_compose_views.ai_text_fix, name='admin-ai-text-fix'),
    path('support-requests/', support_admin_views.support_requests_list, name='admin-support-requests'),
    path('chat-inquiries/', monitoring_views.admin_chat_inquiries, name='admin-chat-inquiries'),
    path('monitoring/', monitoring_views.admin_monitoring, name='admin-monitoring'),
    path('monitoring/run-daily-sync/', monitoring_views.admin_run_daily_sync, name='admin-run-daily-sync'),
    path('orders/', admin_views.admin_orders, name='admin-orders'),
    path(
        'orders/<int:order_id>/form-preview/',
        admin_views.admin_order_form_preview,
        name='admin-order-form-preview',
    ),
    path('orders/<int:order_id>/print/', admin_views.admin_order_print, name='admin-order-print'),
    path('orders/<int:order_id>/invoice/', admin_views.admin_order_invoice, name='admin-order-invoice'),
    path('integration-logs/', admin_views.admin_integration_logs, name='admin-integration-logs'),
    path('service-flags/', service_flag_views.service_flags_view, name='admin-service-flags'),
    path('print-queue/', print_queue_views.admin_print_queue, name='admin-print-queue'),
    path('print-queue/approve-bulk/', print_queue_views.admin_print_queue_approve_bulk, name='admin-print-queue-approve-bulk'),
    path('print-queue/<int:job_id>/approve/', print_queue_views.admin_print_queue_approve, name='admin-print-queue-approve'),
    path('print-queue/<int:job_id>/retry/', print_queue_views.admin_print_queue_retry, name='admin-print-queue-retry'),
    path('print-queue/<int:job_id>/cancel/', print_queue_views.admin_print_queue_cancel, name='admin-print-queue-cancel'),
    path('print-queue/<int:job_id>/skip/', print_queue_views.admin_print_queue_skip, name='admin-print-queue-skip'),
    path('print-queue/<int:job_id>/skip-to-scan/', print_queue_views.admin_print_queue_skip_to_scan, name='admin-print-queue-skip-to-scan'),
    path('print-queue/enqueue/<int:order_id>/', print_queue_views.admin_print_queue_enqueue, name='admin-print-queue-enqueue'),
    path('draw/', admin_views.admin_draw_status, name='admin-draw-status'),
    path('draw/refresh/', admin_views.admin_refresh_draw, name='admin-draw-refresh'),
    path('lotto/check-wins/', admin_views.admin_check_wins, name='admin-lotto-check-wins'),
]

urlpatterns = [
    path('guide/chat/', guide_views.guide_chat, name='guide-chat'),
    path('metrics/ping/', metrics_views.metrics_ping, name='metrics-ping'),
    path('auth/', include(auth_patterns)),
    path('wallet/', include(wallet_patterns)),
    path('lotto/', include(lotto_patterns)),
    path('print/', include(print_patterns)),
    path('admin/', include(admin_patterns)),
    path('orders/<int:order_id>/scan/', print_views.customer_order_scan, name='order-scan'),
    path('orders/<int:order_id>/invoice/', print_views.customer_order_invoice, name='order-invoice'),
    path('', include(router.urls)),
]
