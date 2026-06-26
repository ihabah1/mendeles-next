import re

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0016_documents_platform'),
    ]

    operations = [
        migrations.AddField(
            model_name='businessprofile',
            name='logo_data',
            field=models.TextField(blank=True, verbose_name='לוגו (base64)'),
        ),
    ]
