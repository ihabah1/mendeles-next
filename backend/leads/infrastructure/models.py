import uuid

from django.conf import settings
from django.db import models

from core.models import BaseModel
from leads.domain.status import DuplicatePolicy, LeadActivityType, LeadStatus


class LeadSource(BaseModel):
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="lead_sources")
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=80)
    is_system = models.BooleanField(default=False)

    class Meta:
        db_table = "leads_lead_sources"
        constraints = [
            models.UniqueConstraint(fields=["tenant", "slug"], name="uniq_lead_source_tenant_slug"),
        ]

    def __str__(self) -> str:
        return self.name


class FormDefinition(BaseModel):
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="form_definitions")
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=100)
    fields_schema = models.JSONField(default=list)
    spam_protection = models.JSONField(default=dict)
    duplicate_policy = models.CharField(
        max_length=32,
        choices=DuplicatePolicy.choices,
        default=DuplicatePolicy.ALLOW,
    )

    class Meta:
        db_table = "leads_form_definitions"
        constraints = [
            models.UniqueConstraint(fields=["tenant", "slug"], name="uniq_form_def_tenant_slug"),
        ]

    def __str__(self) -> str:
        return self.name


class Lead(BaseModel):
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="leads")
    name = models.CharField(max_length=200, blank=True, default="")
    phone = models.CharField(max_length=40, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    message = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=LeadStatus.choices, default=LeadStatus.NEW, db_index=True)
    source = models.ForeignKey(LeadSource, on_delete=models.PROTECT, related_name="leads")
    landing_page = models.ForeignKey(
        "content.Page",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="leads",
    )
    page_url = models.URLField(max_length=500, blank=True, default="")
    form = models.ForeignKey(FormDefinition, on_delete=models.SET_NULL, null=True, blank=True, related_name="leads")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
    referrer = models.URLField(max_length=500, blank=True, default="")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_leads",
    )

    class Meta:
        db_table = "leads_leads"
        indexes = [
            models.Index(fields=["tenant", "status", "created_at"]),
            models.Index(fields=["tenant", "email"]),
            models.Index(fields=["tenant", "phone"]),
            models.Index(fields=["landing_page"]),
        ]

    def __str__(self) -> str:
        return self.name or self.email or self.phone or str(self.id)


class LeadUTM(models.Model):
    lead = models.OneToOneField(Lead, on_delete=models.CASCADE, primary_key=True, related_name="utm")
    utm_source = models.CharField(max_length=200, blank=True, default="")
    utm_medium = models.CharField(max_length=200, blank=True, default="")
    utm_campaign = models.CharField(max_length=200, blank=True, default="")
    utm_content = models.CharField(max_length=200, blank=True, default="")
    utm_term = models.CharField(max_length=200, blank=True, default="")

    class Meta:
        db_table = "leads_lead_utms"


class LeadNote(BaseModel):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="lead_notes")
    body = models.TextField()

    class Meta:
        db_table = "leads_lead_notes"
        ordering = ["-created_at"]


class LeadActivity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="activities")
    activity_type = models.CharField(max_length=32, choices=LeadActivityType.choices)
    payload = models.JSONField(default=dict)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lead_activities",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "leads_lead_activities"
        ordering = ["-created_at"]


class LeadAssignment(BaseModel):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="assignments")
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lead_assignments")
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="lead_assignments_made",
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    unassigned_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "leads_lead_assignments"


class FormSubmission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form = models.ForeignKey(FormDefinition, on_delete=models.CASCADE, related_name="submissions")
    lead = models.ForeignKey(Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name="submissions")
    raw_payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "leads_form_submissions"
