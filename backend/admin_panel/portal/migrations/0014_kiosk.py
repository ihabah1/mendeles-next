from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0013_automation_guide_metrics'),
    ]

    operations = [
        migrations.CreateModel(
            name='Kiosk',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120, verbose_name='שם דוכן')),
                ('email', models.EmailField(max_length=254, unique=True, verbose_name='אימייל')),
                ('password_hash', models.CharField(max_length=128)),
                ('location', models.CharField(blank=True, max_length=200, verbose_name='מיקום')),
                ('api_key', models.CharField(blank=True, max_length=64, unique=True)),
                ('is_active', models.BooleanField(default=True, verbose_name='פעיל')),
                ('last_login_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'דוכן',
                'verbose_name_plural': 'דוכנים',
                'ordering': ['name'],
            },
        ),
    ]
