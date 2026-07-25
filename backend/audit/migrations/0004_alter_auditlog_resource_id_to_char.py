# Generated manually for Google connect UUID crash fix

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("audit", "0003_siteerrorlog"),
    ]

    operations = [
        migrations.AlterField(
            model_name="auditlog",
            name="resource_id",
            field=models.CharField(blank=True, db_index=True, max_length=64, null=True),
        ),
    ]
