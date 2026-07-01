from django.db import models

from core.models import BaseModel


class SEOGlobalSettings(BaseModel):
    """Centralized per-tenant SEO configuration."""

    tenant = models.OneToOneField(
        "tenancy.Tenant",
        on_delete=models.CASCADE,
        related_name="seo_settings",
    )
    site_name = models.CharField(max_length=200, blank=True, default="")
    default_title = models.CharField(max_length=200, blank=True, default="")
    default_description = models.TextField(blank=True, default="")
    default_keywords = models.TextField(blank=True, default="")
    default_author = models.CharField(max_length=200, blank=True, default="")
    default_language = models.CharField(max_length=10, blank=True, default="he")
    robots_policy = models.CharField(
        max_length=50,
        blank=True,
        default="index,follow",
        help_text="e.g. index,follow or noindex,nofollow",
    )
    canonical_base_url = models.URLField(blank=True, default="")
    default_og_image = models.URLField(blank=True, default="")
    default_twitter_image = models.URLField(blank=True, default="")
    organization_name = models.CharField(max_length=200, blank=True, default="")
    organization_logo = models.URLField(blank=True, default="")
    organization_url = models.URLField(blank=True, default="")

    class Meta:
        db_table = "seo_global_settings"

    def to_dict(self) -> dict:
        return {
            "site_name": self.site_name,
            "default_title": self.default_title,
            "default_description": self.default_description,
            "default_keywords": self.default_keywords,
            "default_author": self.default_author,
            "default_language": self.default_language,
            "robots_policy": self.robots_policy,
            "canonical_base_url": self.canonical_base_url,
            "default_og_image": self.default_og_image,
            "default_twitter_image": self.default_twitter_image,
            "organization_name": self.organization_name,
            "organization_logo": self.organization_logo,
            "organization_url": self.organization_url,
        }


class SEOSlug(BaseModel):
    """Central slug registry — single source of truth for URL uniqueness."""

    class ContentType(models.TextChoices):
        STATIC = "static", "Static page"
        LANDING_PAGE = "landing_page", "Landing page"
        BLOG = "blog", "Blog article"
        INDUSTRY = "industry", "Industry"
        TEMPLATE = "template", "Template"
        RESOURCE = "resource", "Resource"

    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="seo_slugs")
    slug = models.SlugField(max_length=200)
    locale = models.CharField(max_length=10, default="he")
    content_type = models.CharField(max_length=30, choices=ContentType.choices, default=ContentType.STATIC)
    content_id = models.UUIDField(null=True, blank=True)
    path = models.CharField(max_length=500, blank=True, default="")

    class Meta:
        db_table = "seo_slugs"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "slug", "locale"],
                name="uniq_seo_slug_per_tenant_locale",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "content_type"]),
            models.Index(fields=["tenant", "path"]),
        ]


class SEORedirect(BaseModel):
    """Redirect registry — infrastructure for future redirect management UI."""

    class StatusCode(models.IntegerChoices):
        PERMANENT = 301, "301 Permanent"
        TEMPORARY = 302, "302 Temporary"

    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="seo_redirects")
    from_path = models.CharField(max_length=500)
    to_path = models.CharField(max_length=500)
    status_code = models.IntegerField(choices=StatusCode.choices, default=StatusCode.PERMANENT)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "seo_redirects"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "from_path"],
                name="uniq_seo_redirect_from_path",
            ),
        ]
