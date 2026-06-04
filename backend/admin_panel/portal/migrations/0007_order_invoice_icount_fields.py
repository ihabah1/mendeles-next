# Invoice + print tracking on orders
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0003_serviceflag'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='icount_doc_id',
            field=models.CharField(blank=True, max_length=64, verbose_name='iCount doc id'),
        ),
        migrations.AddField(
            model_name='order',
            name='icount_doc_number',
            field=models.CharField(blank=True, max_length=32, verbose_name='מספר חשבונית'),
        ),
        migrations.AddField(
            model_name='order',
            name='invoice_issued_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='חשבונית הונפקה'),
        ),
        migrations.AddField(
            model_name='order',
            name='printed_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='הודפס'),
        ),
    ]
