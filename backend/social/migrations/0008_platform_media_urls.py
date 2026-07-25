from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("social", "0007_socialcampaign_instagram_media_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="socialcampaign",
            name="linkedin_image_url",
            field=models.CharField(blank=True, default="", max_length=1000),
        ),
        migrations.AddField(
            model_name="socialcampaign",
            name="linkedin_video_url",
            field=models.CharField(blank=True, default="", max_length=1000),
        ),
        migrations.AddField(
            model_name="socialcampaign",
            name="instagram_video_url",
            field=models.CharField(blank=True, default="", max_length=1000),
        ),
    ]
