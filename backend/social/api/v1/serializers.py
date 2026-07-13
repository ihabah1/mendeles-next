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


class UpdateCampaignSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, allow_blank=True)
    captions = serializers.DictField(child=serializers.CharField(allow_blank=True), required=False)
    hashtags = serializers.DictField(required=False)
    cta = serializers.CharField(required=False, allow_blank=True)
    media_prompt = serializers.CharField(required=False, allow_blank=True)
    video_prompt = serializers.CharField(required=False, allow_blank=True)
    media_url = serializers.URLField(required=False, allow_blank=True)
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


class TikTokVideoUploadSerializer(serializers.Serializer):
    data_url = serializers.CharField(required=False, allow_blank=True, default="")
    mode = serializers.ChoiceField(choices=["upload", "ai"], required=False, default="upload")
    count = serializers.IntegerField(required=False, min_value=1, max_value=20, default=1)
