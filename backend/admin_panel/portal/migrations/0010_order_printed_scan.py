from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0009_integrationlog'),
    ]

    operations = [
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'ממתין'),
                    ('paid', 'שולם'),
                    ('printing', 'בדפוס'),
                    ('printed', 'הודפס'),
                    ('shipped', 'נשלח'),
                    ('completed', 'הושלם'),
                    ('cancelled', 'בוטל'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='scan_pdf',
            field=models.BinaryField(blank=True, null=True, verbose_name='סריקת טופס'),
        ),
        migrations.AddField(
            model_name='order',
            name='scanned_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='נסרק'),
        ),
    ]
