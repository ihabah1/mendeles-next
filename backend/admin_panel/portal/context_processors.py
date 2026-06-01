from django.conf import settings

from admin_panel.portal.service_flags import is_enabled


def dashboard_context(request):
    prefix = settings.ADMIN_DASHBOARD_PREFIX
    return {
        'ADMIN_PREFIX': prefix,
        'APP_VERSION': settings.APP_VERSION,
        'AI_AGENT_ENABLED': is_enabled('ai_agent'),
        'PORTAL_DASHBOARD_ENABLED': is_enabled('portal_dashboard'),
        'pending_orders_count': 0,
    }
