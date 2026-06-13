from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0012_printagentheartbeat_printer_status'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AutomationLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('job', models.CharField(choices=[('daily_sync', 'סנכרון יומי'), ('draw_refresh', 'עדכון הגרלה'), ('combo_export', 'ייצוא צירופים')], max_length=32)),
                ('level', models.CharField(choices=[('info', 'מידע'), ('warning', 'אזהרה'), ('error', 'שגיאה')], default='info', max_length=16)),
                ('message', models.CharField(max_length=500)),
                ('details', models.JSONField(blank=True, default=dict)),
                ('duration_ms', models.PositiveIntegerField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'לוג אוטומציה',
                'verbose_name_plural': 'לוגי אוטומציה',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='SiteDailyMetric',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(unique=True)),
                ('page_views', models.PositiveIntegerField(default=0)),
                ('unique_visitors', models.PositiveIntegerField(default=0)),
                ('orders_count', models.PositiveIntegerField(default=0)),
                ('new_users', models.PositiveIntegerField(default=0)),
                ('chat_sessions', models.PositiveIntegerField(default=0)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'מדד יומי',
                'verbose_name_plural': 'מדדים יומיים',
                'ordering': ['-date'],
            },
        ),
        migrations.CreateModel(
            name='GuideChatInquiry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_id', models.CharField(db_index=True, max_length=64)),
                ('guest_name', models.CharField(blank=True, max_length=120)),
                ('page_path', models.CharField(blank=True, max_length=200)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('messages', models.JSONField(blank=True, default=list)),
                ('ai_summary', models.TextField(blank=True)),
                ('escalated', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('customer', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='guide_chats', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'פניית צ׳אט',
                'verbose_name_plural': 'פניות צ׳אט',
                'ordering': ['-updated_at'],
            },
        ),
    ]
