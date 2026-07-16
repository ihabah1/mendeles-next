from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("social", "0006_creative_generation_tracking"),
    ]

    operations = [
        migrations.AddField(
            model_name="socialcampaign",
            name="instagram_media_type",
            field=models.CharField(
                choices=[("image", "Image"), ("video", "Video")],
                default="image",
                max_length=20,
            ),
        ),
    ]
