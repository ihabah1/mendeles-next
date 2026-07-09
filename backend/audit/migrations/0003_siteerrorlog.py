# Generated manually

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("audit", "0002_initial"),
        ("tenancy", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="SiteErrorLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("level", models.CharField(choices=[("error", "Error"), ("warning", "Warning")], db_index=True, default="error", max_length=20)),
                ("source", models.CharField(choices=[("frontend", "Frontend"), ("backend", "Backend"), ("automation", "Automation")], db_index=True, default="frontend", max_length=30)),
                ("message", models.TextField()),
                ("stack_trace", models.TextField(blank=True, default="")),
                ("url", models.CharField(blank=True, default="", max_length=500)),
                ("user_email", models.CharField(blank=True, default="", max_length=255)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("tenant", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="site_error_logs", to="tenancy.tenant")),
            ],
            options={
                "db_table": "site_error_logs",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["tenant", "-created_at"], name="site_error_tenant_created_idx"),
                    models.Index(fields=["source", "-created_at"], name="site_error_source_created_idx"),
                ],
            },
        ),
    ]
