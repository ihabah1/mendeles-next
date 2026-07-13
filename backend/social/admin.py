from django.contrib import admin

from social.infrastructure.models import SocialCampaign


@admin.register(SocialCampaign)
class SocialCampaignAdmin(admin.ModelAdmin):
    list_display = ("title", "campaign_type", "status", "media_type", "scheduled_at", "published_at", "created_at")
    list_filter = ("status", "campaign_type", "media_type")
    search_fields = ("title", "goal", "cta")
    readonly_fields = ("created_at", "updated_at", "published_at", "buffer_update_ids", "publish_log")
