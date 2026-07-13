from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("social", "0005_tiktok_videos_json"),
    ]

    operations = [
        migrations.AddField(
            model_name="socialcampaign",
            name="creative_log_json",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="socialcampaign",
            name="creative_progress",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="socialcampaign",
            name="tiktok_generating",
            field=models.BooleanField(default=False),
        ),
    ]
