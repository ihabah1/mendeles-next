from django.conf import settings
from django.db import models

from content.domain.status import PageStatus, PageType
from core.models import BaseModel


class ContentTemplate(BaseModel):
    """Reusable page structure — defines default blocks for a page type."""

    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="content_templates")
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200)
    description = models.TextField(blank=True, default="")
    page_type = models.CharField(max_length=30, choices=PageType.choices, default=PageType.LANDING_PAGE)
    block_schema = models.JSONField(default=list, help_text="Default block definitions [{type, config}]")
    theme_slug = models.SlugField(max_length=100, blank=True, default="")
    theme_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Theme tokens: colors, fonts, spacing overrides",
    )
    is_system = models.BooleanField(default=False)

    class Meta:
        db_table = "content_templates"
        constraints = [
            models.UniqueConstraint(fields=["tenant", "slug"], name="uniq_content_template_slug"),
        ]


class Taxonomy(BaseModel):
    """Taxonomy definition — categories, tags, or custom vocabularies."""

    class Kind(models.TextChoices):
        CATEGORY = "category", "Category"
        TAG = "tag", "Tag"
        CUSTOM = "custom", "Custom"

    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="taxonomies")
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.CATEGORY)
    is_hierarchical = models.BooleanField(default=True)
    allow_multiple = models.BooleanField(default=False, help_text="Page may have multiple terms")

    class Meta:
        db_table = "content_taxonomies"
        constraints = [
            models.UniqueConstraint(fields=["tenant", "slug"], name="uniq_content_taxonomy_slug"),
        ]


class TaxonomyTerm(BaseModel):
    """Category, tag, or custom term within a taxonomy."""

    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="taxonomy_terms")
    taxonomy = models.ForeignKey(Taxonomy, on_delete=models.CASCADE, related_name="terms")
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200)
    description = models.TextField(blank=True, default="")
    sort_order = models.PositiveIntegerField(default=0)
    full_path = models.CharField(max_length=500, blank=True, default="", help_text="Hierarchical path segment")

    class Meta:
        db_table = "content_taxonomy_terms"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "taxonomy", "slug"],
                name="uniq_taxonomy_term_slug",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "taxonomy"]),
            models.Index(fields=["tenant", "full_path"]),
        ]


class Page(BaseModel):
    """Central content page model — supports hierarchy, versioning, and publishing."""

    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="pages")
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    template = models.ForeignKey(
        ContentTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pages",
    )
    page_type = models.CharField(max_length=30, choices=PageType.choices, default=PageType.LANDING_PAGE)
    status = models.CharField(max_length=20, choices=PageStatus.choices, default=PageStatus.DRAFT, db_index=True)
    locale = models.CharField(max_length=10, default="he")
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=200)
    full_path = models.CharField(max_length=500, blank=True, default="", db_index=True)
    sort_order = models.PositiveIntegerField(default=0)
    meta_title = models.CharField(max_length=200, blank=True, default="")
    meta_description = models.TextField(blank=True, default="")
    published_version = models.PositiveIntegerField(default=0)
    published_at = models.DateTimeField(null=True, blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="authored_pages",
        help_text="Content author attribution (may differ from created_by)",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_pages",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_pages",
    )

    class Meta:
        db_table = "content_pages"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "full_path", "locale"],
                name="uniq_page_path_locale",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "page_type"]),
            models.Index(fields=["tenant", "parent"]),
        ]

    @property
    def is_published(self) -> bool:
        return self.status == PageStatus.PUBLISHED


class PageVersion(BaseModel):
    """Immutable snapshot of a page at publish time."""

    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="versions")
    version_number = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=PageStatus.choices)
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=200)
    full_path = models.CharField(max_length=500)
    meta_title = models.CharField(max_length=200, blank=True, default="")
    meta_description = models.TextField(blank=True, default="")
    blocks_snapshot = models.JSONField(default=list)
    terms_snapshot = models.JSONField(default=list)
    change_summary = models.CharField(max_length=500, blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="page_versions",
    )

    class Meta:
        db_table = "content_page_versions"
        constraints = [
            models.UniqueConstraint(
                fields=["page", "version_number"],
                name="uniq_page_version_number",
            ),
        ]
        ordering = ["-version_number"]


class ContentBlock(BaseModel):
    """Ordered content block on a page — builder will edit these in Phase 3."""

    class BlockType(models.TextChoices):
        HERO = "hero", "Hero"
        TEXT = "text", "Text"
        RICH_TEXT = "rich_text", "Rich text"
        CTA = "cta", "Call to action"
        FAQ = "faq", "FAQ"
        IMAGE = "image", "Image"
        GALLERY = "gallery", "Gallery"
        FEATURES = "features", "Features"
        TESTIMONIALS = "testimonials", "Testimonials"
        FORM = "form", "Form"
        CONTACT_FORM = "contact_form", "Contact form"
        CUSTOM = "custom", "Custom"

    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="blocks")
    block_type = models.CharField(max_length=30, choices=BlockType.choices, default=BlockType.TEXT)
    sort_order = models.PositiveIntegerField(default=0)
    config = models.JSONField(default=dict)
    is_visible = models.BooleanField(default=True)

    class Meta:
        db_table = "content_blocks"
        ordering = ["sort_order"]
        indexes = [
            models.Index(fields=["page", "sort_order"]),
        ]


class PageTerm(BaseModel):
    """M2M: page ↔ taxonomy term (categories, tags)."""

    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="page_terms")
    term = models.ForeignKey(TaxonomyTerm, on_delete=models.CASCADE, related_name="page_terms")

    class Meta:
        db_table = "content_page_terms"
        constraints = [
            models.UniqueConstraint(fields=["page", "term"], name="uniq_page_term"),
        ]


class InternalLink(BaseModel):
    """Centralized internal linking graph between pages."""

    class LinkType(models.TextChoices):
        RELATED = "related", "Related"
        CROSS_SELL = "cross_sell", "Cross-sell"
        MANUAL = "manual", "Manual"
        AUTOMATIC = "automatic", "Automatic"

    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="internal_links")
    source_page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="outbound_links")
    target_page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="inbound_links")
    link_type = models.CharField(max_length=20, choices=LinkType.choices, default=LinkType.MANUAL)
    anchor_text = models.CharField(max_length=300, blank=True, default="")
    sort_order = models.PositiveIntegerField(default=0)
    is_automatic = models.BooleanField(default=False)

    class Meta:
        db_table = "content_internal_links"
        constraints = [
            models.UniqueConstraint(
                fields=["source_page", "target_page", "link_type"],
                name="uniq_internal_link",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "source_page"]),
            models.Index(fields=["tenant", "target_page"]),
        ]


class MediaAsset(BaseModel):
    """Central media registry — image, video, and document references for blocks."""

    class MediaType(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"
        DOCUMENT = "document", "Document"

    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="media_assets")
    media_type = models.CharField(max_length=20, choices=MediaType.choices)
    title = models.CharField(max_length=300)
    url = models.URLField(max_length=1000)
    alt_text = models.CharField(max_length=300, blank=True, default="")
    mime_type = models.CharField(max_length=100, blank=True, default="")
    file_size = models.PositiveIntegerField(null=True, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_media",
    )

    class Meta:
        db_table = "content_media_assets"
        indexes = [
            models.Index(fields=["tenant", "media_type"]),
        ]
