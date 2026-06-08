from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('portal', '0010_order_printed_scan'),
    ]

    operations = [
        migrations.CreateModel(
            name='PrintAgentHeartbeat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('agent_id', models.CharField(default='default', max_length=64, unique=True, verbose_name='מזהה סוכן')),
                ('hostname', models.CharField(blank=True, max_length=120, verbose_name='מחשב')),
                ('version', models.CharField(blank=True, max_length=40, verbose_name='גרסה')),
                ('last_seen_at', models.DateTimeField(blank=True, null=True, verbose_name='נראה לאחרונה')),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'סוכן הדפסה',
                'verbose_name_plural': 'סוכני הדפסה',
            },
        ),
        migrations.CreateModel(
            name='PrintJob',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(
                    choices=[
                        ('queued', 'בתור'),
                        ('approved', 'מאושר'),
                        ('claimed', 'נלקח'),
                        ('printing', 'בדפוס'),
                        ('printed', 'הודפס'),
                        ('failed', 'נכשל'),
                        ('cancelled', 'בוטל'),
                    ],
                    db_index=True,
                    default='queued',
                    max_length=20,
                )),
                ('priority', models.PositiveSmallIntegerField(default=0, verbose_name='עדיפות')),
                ('payload_json', models.JSONField(blank=True, default=dict, verbose_name='נתוני הדפסה')),
                ('attempts', models.PositiveSmallIntegerField(default=0, verbose_name='ניסיונות')),
                ('max_attempts', models.PositiveSmallIntegerField(default=3, verbose_name='מקסימום ניסיונות')),
                ('last_error', models.CharField(blank=True, max_length=500, verbose_name='שגיאה אחרונה')),
                ('approved_at', models.DateTimeField(blank=True, null=True, verbose_name='אושר')),
                ('claimed_at', models.DateTimeField(blank=True, null=True, verbose_name='נלקח')),
                ('claimed_by_agent', models.CharField(blank=True, max_length=64, verbose_name='סוכן')),
                ('completed_at', models.DateTimeField(blank=True, null=True, verbose_name='הושלם')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('approved_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='approved_print_jobs',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('order', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='print_job',
                    to='portal.order',
                )),
            ],
            options={
                'verbose_name': 'משימת הדפסה',
                'verbose_name_plural': 'תור הדפסה',
                'ordering': ['-priority', 'created_at'],
            },
        ),
    ]
