"""Landing page for the Django API server root (/)."""
from django.conf import settings
from django.http import JsonResponse


def api_root(request):
    frontend = settings.CORS_ALLOWED_ORIGINS[0] if settings.CORS_ALLOWED_ORIGINS else 'http://localhost:3000'
    return JsonResponse({
        'service': 'Mandeles Django API',
        'version': getattr(settings, 'APP_VERSION', '1.0'),
        'message': 'זהו שרת ה-API. האתר (UI) רץ על React/Next.js.',
        'links': {
            'api': request.build_absolute_uri('/api/'),
            'admin': request.build_absolute_uri('/admin/'),
            'frontend': frontend,
        },
    })
