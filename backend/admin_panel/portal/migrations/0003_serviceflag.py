# Generated migration for ServiceFlag model

from django.db import migrations, models


def seed_service_flags(apps, schema_editor):
    from django.conf import settings

    ServiceFlag = apps.get_model('portal', 'ServiceFlag')
    specs = [
        ('portal_dashboard', 'דשבורד ניהול Django', 'ממשק /manage — לקוחות, הזמנות, לוגים ובקשות AI', 'PORTAL_DASHBOARD_ENABLED', False),
        ('ai_agent', 'סוכן AI', 'שליחת בקשות שינוי ל-Gemini ויצירת PR ב-GitHub', 'AI_AGENT_ENABLED', False),
        ('legacy_services', 'שירותי Flask ישנים', 'פרוקסי לשירותי לוטו / ארנק / טוטו (Flask)', 'LEGACY_SERVICES_ENABLED', False),
        ('legacy_auto_start', 'הפעלה אוטומטית Flask', 'הפעלת שירותי legacy אוטומטית עם עליית השרת', 'LEGACY_AUTO_START', True),
    ]
    for key, label, desc, setting_attr, requires_restart in specs:
        default_enabled = bool(getattr(settings, setting_attr, False))
        ServiceFlag.objects.get_or_create(
            key=key,
            defaults={
                'label': label,
                'description': desc,
                'enabled': default_enabled,
                'requires_restart': requires_restart,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0002_lotto_models'),
    ]

    operations = [
        migrations.CreateModel(
            name='ServiceFlag',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(max_length=64, unique=True, verbose_name='מפתח')),
                ('label', models.CharField(max_length=120, verbose_name='שם')),
                ('description', models.TextField(blank=True, verbose_name='תיאור')),
                ('enabled', models.BooleanField(default=True, verbose_name='פעיל')),
                ('requires_restart', models.BooleanField(default=False, help_text='שינוי יישמר אך יחול רק אחרי restart לשרת Django', verbose_name='דורש הפעלה מחדש')),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'דגל שירות',
                'verbose_name_plural': 'דגלי שירות',
                'ordering': ['key'],
            },
        ),
        migrations.RunPython(seed_service_flags, migrations.RunPython.noop),
    ]
