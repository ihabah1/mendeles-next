from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("social", "0008_platform_media_urls"),
    ]

    operations = [
        migrations.AddField(
            model_name="socialcampaign",
            name="facebook_image_url",
            field=models.CharField(blank=True, default="", max_length=1000),
        ),
        migrations.AddField(
            model_name="socialcampaign",
            name="facebook_video_url",
            field=models.CharField(blank=True, default="", max_length=1000),
        ),
    ]
