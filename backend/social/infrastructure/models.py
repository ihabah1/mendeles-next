from django.db import models

from core.models import BaseModel
from social.domain.enums import CampaignStatus, CampaignTone, CampaignType, MediaType


class SocialCampaign(BaseModel):
    """AI-generated social campaign for Buffer publishing."""

    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.CASCADE,
        related_name="social_campaigns",
    )
    created_by = models.ForeignKey(
        "identity.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="social_campaigns",
    )
    title = models.CharField(max_length=300, blank=True, default="")
    goal = models.TextField(blank=True, default="")
    campaign_type = models.CharField(
        max_length=40,
        choices=CampaignType.choices,
        default=CampaignType.TRAFFIC,
    )
    tone = models.CharField(
        max_length=40,
        choices=CampaignTone.choices,
        default=CampaignTone.PROFESSIONAL,
    )
    target_audience = models.CharField(max_length=500, blank=True, default="")
    website_url = models.CharField(max_length=500, blank=True, default="")
    platforms = models.JSONField(default=list, blank=True)
    captions_json = models.JSONField(default=dict, blank=True)
    hashtags_json = models.JSONField(default=dict, blank=True)
    cta = models.CharField(max_length=500, blank=True, default="")
    main_idea = models.TextField(blank=True, default="")
    media_type = models.CharField(
        max_length=20,
        choices=MediaType.choices,
        default=MediaType.IMAGE,
    )
    media_prompt = models.TextField(blank=True, default="")
    video_prompt = models.TextField(blank=True, default="")
    media_url = models.CharField(max_length=1000, blank=True, default="")
    linkedin_image_url = models.CharField(max_length=1000, blank=True, default="")
    linkedin_video_url = models.CharField(max_length=1000, blank=True, default="")
    instagram_image_url = models.CharField(max_length=1000, blank=True, default="")
    instagram_video_url = models.CharField(max_length=1000, blank=True, default="")
    instagram_media_type = models.CharField(
        max_length=20,
        choices=[("image", "Image"), ("video", "Video")],
        default="image",
    )
    tiktok_video_url = models.CharField(max_length=1000, blank=True, default="")
    tiktok_videos_json = models.JSONField(default=list, blank=True)
    creative_log_json = models.JSONField(default=list, blank=True)
    creative_progress = models.PositiveSmallIntegerField(default=0)
    tiktok_generating = models.BooleanField(default=False)
    simulated_at = models.DateTimeField(null=True, blank=True)
    simulation_log = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=30,
        choices=CampaignStatus.choices,
        default=CampaignStatus.DRAFT,
        db_index=True,
    )
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    timezone = models.CharField(max_length=64, blank=True, default="Asia/Jerusalem")
    buffer_update_ids = models.JSONField(default=dict, blank=True)
    last_error = models.TextField(blank=True, default="")
    publish_log = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "social_campaigns"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status", "created_at"]),
        ]

    def __str__(self) -> str:
        return self.title or f"Campaign {self.id}"
