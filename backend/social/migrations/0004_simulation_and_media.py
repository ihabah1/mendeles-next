# Generated manually for simulation + Instagram/TikTok creatives

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("social", "0003_alter_media_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="socialcampaign",
            name="instagram_image_url",
            field=models.CharField(blank=True, default="", max_length=1000),
        ),
        migrations.AddField(
            model_name="socialcampaign",
            name="tiktok_video_url",
            field=models.CharField(blank=True, default="", max_length=1000),
        ),
        migrations.AddField(
            model_name="socialcampaign",
            name="simulated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="socialcampaign",
            name="simulation_log",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AlterField(
            model_name="socialcampaign",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("generating", "Generating"),
                    ("ready", "Ready"),
                    ("simulated", "Simulated"),
                    ("scheduled", "Scheduled"),
                    ("publishing", "Publishing"),
                    ("published", "Published"),
                    ("failed", "Failed"),
                ],
                db_index=True,
                default="draft",
                max_length=30,
            ),
        ),
    ]
