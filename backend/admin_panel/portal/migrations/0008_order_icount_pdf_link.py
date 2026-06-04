from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0007_order_invoice_icount_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='icount_pdf_link',
            field=models.URLField(
                blank=True,
                max_length=512,
                verbose_name='קישור PDF חשבונית',
            ),
        ),
    ]
