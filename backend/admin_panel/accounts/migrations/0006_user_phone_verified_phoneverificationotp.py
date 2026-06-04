# Generated manually for SMS phone verification
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_user_email_verified_emailverificationtoken'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='phone_verified',
            field=models.BooleanField(default=False, verbose_name='טלפון מאומת'),
        ),
        migrations.CreateModel(
            name='PhoneVerificationOTP',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('phone_e164', models.CharField(db_index=True, max_length=20)),
                ('code_hash', models.CharField(max_length=128)),
                ('attempts', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('used_at', models.DateTimeField(blank=True, null=True)),
                (
                    'user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='phone_verification_otps',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'verbose_name': 'קוד אימות SMS',
                'verbose_name_plural': 'קודי אימות SMS',
                'ordering': ['-created_at'],
            },
        ),
    ]
