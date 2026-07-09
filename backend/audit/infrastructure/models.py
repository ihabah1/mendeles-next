import uuid

from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=100, db_index=True)
    resource_type = models.CharField(max_length=50, null=True, blank=True)
    resource_id = models.UUIDField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "audit_logs"
        indexes = [
            models.Index(fields=["tenant", "-created_at"]),
            models.Index(fields=["user"]),
            models.Index(fields=["resource_type", "resource_id"]),
        ]
        ordering = ["-created_at"]


class SiteErrorLog(models.Model):
    class Level(models.TextChoices):
        ERROR = "error", "Error"
        WARNING = "warning", "Warning"

    class Source(models.TextChoices):
        FRONTEND = "frontend", "Frontend"
        BACKEND = "backend", "Backend"
        AUTOMATION = "automation", "Automation"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="site_error_logs",
    )
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.ERROR, db_index=True)
    source = models.CharField(max_length=30, choices=Source.choices, default=Source.FRONTEND, db_index=True)
    message = models.TextField()
    stack_trace = models.TextField(blank=True, default="")
    url = models.CharField(max_length=500, blank=True, default="")
    user_email = models.CharField(max_length=255, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "site_error_logs"
        indexes = [
            models.Index(fields=["tenant", "-created_at"]),
            models.Index(fields=["source", "-created_at"]),
        ]
        ordering = ["-created_at"]
