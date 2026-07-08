# Generated manually for UserInboxMessage

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("identity", "0001_initial"),
        ("tenancy", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserInboxMessage",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("subject", models.CharField(max_length=255)),
                ("body", models.TextField()),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "recipient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="inbox_messages",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "sender",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sent_inbox_messages",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="inbox_messages",
                        to="tenancy.tenant",
                    ),
                ),
            ],
            options={
                "db_table": "user_inbox_messages",
            },
        ),
        migrations.AddIndex(
            model_name="userinboxmessage",
            index=models.Index(fields=["recipient", "read_at"], name="user_inbox_recipie_a1b2c3_idx"),
        ),
        migrations.AddIndex(
            model_name="userinboxmessage",
            index=models.Index(fields=["tenant", "created_at"], name="user_inbox_tenant__d4e5f6_idx"),
        ),
    ]
