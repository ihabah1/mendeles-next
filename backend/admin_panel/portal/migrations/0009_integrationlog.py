from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0008_order_icount_pdf_link'),
    ]

    operations = [
        migrations.CreateModel(
            name='IntegrationLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('source', models.CharField(choices=[('icount', 'iCount'), ('print', 'הדפסה')], max_length=16)),
                ('level', models.CharField(choices=[('info', 'מידע'), ('warning', 'אזהרה'), ('error', 'שגיאה')], default='info', max_length=16)),
                ('message', models.CharField(max_length=500)),
                ('details', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='integration_logs', to='portal.order')),
            ],
            options={
                'verbose_name': 'לוג אינטגרציה',
                'verbose_name_plural': 'לוגי אינטגרציה',
                'ordering': ['-created_at'],
            },
        ),
    ]
