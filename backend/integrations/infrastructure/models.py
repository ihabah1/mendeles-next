from django.db import models

from core.models import BaseModel
from integrations.domain.enums import ConnectionStatus, GoogleServiceType, SyncStatus


class GoogleServiceConnection(BaseModel):
    """Per-tenant Google service OAuth connection and sync metadata."""

    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.CASCADE,
        related_name="google_connections",
    )
    service_type = models.CharField(max_length=30, choices=GoogleServiceType.choices)
    status = models.CharField(
        max_length=30,
        choices=ConnectionStatus.choices,
        default=ConnectionStatus.NOT_CONNECTED,
        db_index=True,
    )
    connected_account_email = models.CharField(max_length=320, blank=True, default="")
    # GSC site URL (sc-domain:example.com or https://example.com/)
    property_id = models.CharField(max_length=500, blank=True, default="")
    property_label = models.CharField(max_length=500, blank=True, default="")
    encrypted_access_token = models.TextField(blank=True, default="")
    encrypted_refresh_token = models.TextField(blank=True, default="")
    token_expires_at = models.DateTimeField(null=True, blank=True)
    oauth_state = models.CharField(max_length=128, blank=True, default="", db_index=True)
    oauth_code_verifier = models.CharField(max_length=128, blank=True, default="")
    scopes = models.JSONField(default=list, blank=True)
    last_error = models.TextField(blank=True, default="")
    last_sync_at = models.DateTimeField(null=True, blank=True)
    next_sync_at = models.DateTimeField(null=True, blank=True)
    sync_enabled = models.BooleanField(default=True)

    class Meta:
        db_table = "integrations_google_connections"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "service_type"],
                name="uniq_google_connection_per_tenant_service",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "service_type", "status"]),
        ]


class GoogleProperty(BaseModel):
    """Cached list of GSC sites or GA4 properties from Google APIs."""

    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="google_properties")
    service_type = models.CharField(max_length=30, choices=GoogleServiceType.choices)
    external_id = models.CharField(max_length=500)
    label = models.CharField(max_length=500, blank=True, default="")
    is_active = models.BooleanField(default=False)

    class Meta:
        db_table = "integrations_google_properties"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "service_type", "external_id"],
                name="uniq_google_property",
            ),
        ]


class IntegrationSyncRecord(BaseModel):
    """Synchronized data from Google services — raw + processed."""

    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="integration_syncs")
    service_type = models.CharField(max_length=30, choices=GoogleServiceType.choices)
    source = models.CharField(max_length=100, blank=True, default="")
    language = models.CharField(max_length=10, blank=True, default="")
    country = models.CharField(max_length=10, blank=True, default="")
    retrieved_at = models.DateTimeField()
    raw_response = models.JSONField(default=dict, blank=True)
    processed_data = models.JSONField(default=dict, blank=True)
    sync_status = models.CharField(max_length=20, choices=SyncStatus.choices, default=SyncStatus.PENDING)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    next_sync_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, default="")
    automation_job = models.ForeignKey(
        "automation.AutomationJob",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="integration_syncs",
    )

    class Meta:
        db_table = "integrations_sync_records"
        indexes = [
            models.Index(fields=["tenant", "service_type", "retrieved_at"]),
            models.Index(fields=["tenant", "sync_status"]),
        ]
