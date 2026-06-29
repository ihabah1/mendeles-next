from django.db import models

from core.models import BaseModel


class Tenant(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "פעיל"
        SUSPENDED = "suspended", "מושהה"
        TRIAL = "trial", "ניסיון"

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    settings_json = models.JSONField(default=dict, blank=True, db_column="settings")

    class Meta:
        db_table = "tenants"
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return self.name
