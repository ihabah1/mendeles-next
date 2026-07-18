from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("identity", "0002_userinboxmessage"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="google_sub",
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["google_sub"], name="users_google__66ac63_idx"),
        ),
        migrations.CreateModel(
            name="OAuthLoginState",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("state", models.CharField(db_index=True, max_length=64, unique=True)),
                ("ticket", models.CharField(blank=True, db_index=True, default="", max_length=64)),
                ("expires_at", models.DateTimeField()),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="oauth_login_states",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "oauth_login_states",
            },
        ),
    ]
