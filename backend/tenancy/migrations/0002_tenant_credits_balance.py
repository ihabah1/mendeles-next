from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tenancy", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="credits_balance",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
