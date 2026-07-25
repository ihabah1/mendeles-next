from rest_framework import serializers

from social.domain.enums import (
    SUPPORTED_PLATFORMS,
    CampaignTone,
    CampaignType,
    MediaType,
)


class GenerateCampaignSerializer(serializers.Serializer):
    goal = serializers.CharField(required=True, allow_blank=False)
    campaign_type = serializers.ChoiceField(choices=CampaignType.choices)
    tone = serializers.ChoiceField(choices=CampaignTone.choices)
    target_audience = serializers.CharField(required=False, allow_blank=True, default="")
    website_url = serializers.CharField(required=False, allow_blank=True, default="")
    media_type = serializers.ChoiceField(choices=MediaType.choices, default=MediaType.IMAGE)
    platforms = serializers.ListField(
        child=serializers.ChoiceField(choices=[(p, p) for p in SUPPORTED_PLATFORMS]),
        allow_empty=False,
    )
    tiktok_video_count = serializers.IntegerField(required=False, min_value=1, max_value=20, default=5)


class UpdateCampaignSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, allow_blank=True)
    captions = serializers.DictField(child=serializers.CharField(allow_blank=True), required=False)
    hashtags = serializers.DictField(required=False)
    cta = serializers.CharField(required=False, allow_blank=True)
    media_prompt = serializers.CharField(required=False, allow_blank=True)
    video_prompt = serializers.CharField(required=False, allow_blank=True)
    media_url = serializers.URLField(required=False, allow_blank=True)
    instagram_media_type = serializers.ChoiceField(choices=["image", "video"], required=False)
    platforms = serializers.ListField(
        child=serializers.ChoiceField(choices=[(p, p) for p in SUPPORTED_PLATFORMS]),
        required=False,
    )
    timezone = serializers.CharField(required=False, allow_blank=True)


class PublishCampaignSerializer(serializers.Serializer):
    campaign_id = serializers.UUIDField(required=True)
    mode = serializers.ChoiceField(choices=["now", "schedule"], default="now")
    scheduled_at = serializers.CharField(required=False, allow_blank=True, default="")
    timezone = serializers.CharField(required=False, allow_blank=True, default="Asia/Jerusalem")
    auto_release = serializers.BooleanField(required=False, default=False)
    interval_minutes = serializers.IntegerField(required=False, min_value=0, max_value=43200, default=0)
    repeat_count = serializers.IntegerField(required=False, min_value=1, max_value=48, default=1)
    interval_minutes = serializers.IntegerField(required=False, min_value=5, max_value=43200, default=60)
    repeat_count = serializers.IntegerField(required=False, min_value=1, max_value=48, default=1)


class BatchRepublishSerializer(serializers.Serializer):
    campaign_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
        max_length=50,
    )
    strategy = serializers.ChoiceField(
        choices=["random_one", "shuffle_all"],
        default="random_one",
    )
    mode = serializers.ChoiceField(choices=["now", "schedule"], default="schedule")
    scheduled_at = serializers.CharField(required=False, allow_blank=True, default="")
    interval_minutes = serializers.IntegerField(required=False, min_value=5, max_value=43200, default=60)
    timezone = serializers.CharField(required=False, allow_blank=True, default="Asia/Jerusalem")


class RandomRepublishCronSerializer(serializers.Serializer):
    enabled = serializers.BooleanField(required=True)
    interval_hours = serializers.IntegerField(required=False, min_value=1, max_value=720, default=6)
    campaign_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
        max_length=50,
    )


class PlatformMediaUploadSerializer(serializers.Serializer):
    platform = serializers.ChoiceField(choices=[(p, p) for p in SUPPORTED_PLATFORMS])
    kind = serializers.ChoiceField(choices=["image", "video"])
    data_url = serializers.CharField(required=True, allow_blank=False)


class TikTokVideoUploadSerializer(serializers.Serializer):
    data_url = serializers.CharField(required=False, allow_blank=True, default="")
    mode = serializers.ChoiceField(choices=["upload", "manual", "ai", "promo"], required=False, default="upload")
    use_for_instagram = serializers.BooleanField(required=False, default=False)
    count = serializers.IntegerField(required=False, min_value=1, max_value=20, default=1)
    promo_ids = serializers.ListField(
        child=serializers.CharField(allow_blank=False),
        required=False,
        allow_empty=False,
    )
