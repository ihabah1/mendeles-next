"""URL routes for the REST API consumed by the React/Next.js frontend."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from . import admin_views, lotto_views, service_flag_views, views, wallet_views

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
    path('verify-email/', views.verify_email_view, name='auth-verify-email'),
    path('resend-verification/', views.resend_verification_view, name='auth-resend-verification'),
    path('google/', views.google_login, name='auth-google'),
    path('logout/', views.logout_view, name='auth-logout'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('verify/', TokenVerifyView.as_view(), name='auth-verify'),
    path('me/', views.MeView.as_view(), name='auth-me'),
]

wallet_patterns = [
    path('balance/', wallet_views.wallet_balance, name='wallet-balance'),
    path('history/', wallet_views.wallet_history, name='wallet-history'),
    path('topup/', wallet_views.wallet_topup, name='wallet-topup'),
]

lotto_patterns = [
    path('my-sets/', lotto_views.my_sets, name='lotto-my-sets'),
    path('submit/', lotto_views.submit_order, name='lotto-submit'),
    path('subscribe/', lotto_views.subscribe, name='lotto-subscribe'),
]

admin_patterns = [
    path('stats/', admin_views.admin_stats, name='admin-stats'),
    path('orders/', admin_views.admin_orders, name='admin-orders'),
    path('service-flags/', service_flag_views.service_flags_view, name='admin-service-flags'),
]

urlpatterns = [
    path('auth/', include(auth_patterns)),
    path('wallet/', include(wallet_patterns)),
    path('lotto/', include(lotto_patterns)),
    path('admin/', include(admin_patterns)),
    path('', include(router.urls)),
]
