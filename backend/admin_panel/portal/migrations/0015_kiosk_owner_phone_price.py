from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0014_kiosk'),
    ]

    operations = [
        migrations.AddField(
            model_name='kiosk',
            name='owner_name',
            field=models.CharField(blank=True, max_length=120, verbose_name='שם בעלים'),
        ),
        migrations.AddField(
            model_name='kiosk',
            name='phone',
            field=models.CharField(blank=True, max_length=32, verbose_name='טלפון'),
        ),
        migrations.AddField(
            model_name='kiosk',
            name='price_per_table',
            field=models.DecimalField(decimal_places=2, default=Decimal('3'), max_digits=8, verbose_name='מחיר לטבלה ₪'),
        ),
    ]
