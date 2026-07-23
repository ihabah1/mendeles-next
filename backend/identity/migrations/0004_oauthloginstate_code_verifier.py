from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("identity", "0003_user_google_sub_oauthloginstate"),
    ]

    operations = [
        migrations.AddField(
            model_name="oauthloginstate",
            name="code_verifier",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
    ]
