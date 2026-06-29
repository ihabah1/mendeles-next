import uuid

from django.conf import settings
from django.db import models


class SystemSetting(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="system_settings",
    )
    key = models.CharField(max_length=100)
    value = models.JSONField()
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_settings",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "system_settings"
        constraints = [
            models.UniqueConstraint(fields=["tenant", "key"], name="uniq_setting_per_tenant"),
        ]
