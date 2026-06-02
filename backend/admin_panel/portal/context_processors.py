from django.conf import settings

from admin_panel.portal.service_flags import is_enabled


def page_code_context(request):
    from admin_panel.page_codes import resolve_for_django_url

    match = getattr(request, 'resolver_match', None)
    entry = resolve_for_django_url(getattr(match, 'url_name', None) if match else None)
    if entry:
        return {
            'page_code': entry.code,
            'page_code_label': entry.label_he,
        }
    return {}


def dashboard_context(request):
    prefix = settings.ADMIN_DASHBOARD_PREFIX
    return {
        'ADMIN_PREFIX': prefix,
        'APP_VERSION': settings.APP_VERSION,
        'AI_AGENT_ENABLED': is_enabled('ai_agent'),
        'PORTAL_DASHBOARD_ENABLED': is_enabled('portal_dashboard'),
        'pending_orders_count': 0,
    }
