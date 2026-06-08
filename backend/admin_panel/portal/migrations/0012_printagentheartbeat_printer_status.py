from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0011_printjob_printagentheartbeat'),
    ]

    operations = [
        migrations.AddField(
            model_name='printagentheartbeat',
            name='printer_ready',
            field=models.BooleanField(default=False, verbose_name='מדפסת מוכנה'),
        ),
        migrations.AddField(
            model_name='printagentheartbeat',
            name='printer_message',
            field=models.CharField(blank=True, max_length=200, verbose_name='סטטוס מדפסת'),
        ),
    ]
