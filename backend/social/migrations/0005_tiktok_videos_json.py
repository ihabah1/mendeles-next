# Generated manually for multi TikTok AI videos

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("social", "0004_simulation_and_media"),
    ]

    operations = [
        migrations.AddField(
            model_name="socialcampaign",
            name="tiktok_videos_json",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
