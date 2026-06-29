class TenantContextMiddleware:
    """Attach tenant_id from JWT auth after authentication runs in DRF."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant_id = None
        if hasattr(request, "user") and request.user.is_authenticated:
            request.tenant_id = getattr(request.user, "default_tenant_id", None)
        return self.get_response(request)
