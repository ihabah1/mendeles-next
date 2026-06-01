from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from api.root import api_root

# Django admin (full CRUD over every model) stays at /admin.
# REST API for the React frontend lives under /api.
urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]

# Optional legacy server-rendered dashboard at /manage (+ AI agent views).
if settings.PORTAL_DASHBOARD_ENABLED:
    urlpatterns += [
        path('', include('admin_panel.portal.urls')),
        path('accounts/', include('admin_panel.accounts.urls')),
    ]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
