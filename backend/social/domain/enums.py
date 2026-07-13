from django.db.models import TextChoices


class CampaignType(TextChoices):
    TRAFFIC = "traffic", "Traffic"
    TOOL_LAUNCH = "tool_launch", "Tool Launch"
    VIRAL = "viral", "Viral"
    TUTORIAL = "tutorial", "Tutorial"
    PRODUCT = "product", "Product"
    ANNOUNCEMENT = "announcement", "Announcement"
    NEWS = "news", "News"


class CampaignTone(TextChoices):
    PROFESSIONAL = "professional", "Professional"
    CASUAL = "casual", "Casual"
    FUNNY = "funny", "Funny"
    EMOTIONAL = "emotional", "Emotional"
    CURIOUS = "curious", "Curious"
    SHOCKING = "shocking", "Shocking"


class MediaType(TextChoices):
    IMAGE = "image", "Image"
    VIDEO = "video", "Video"


class CampaignStatus(TextChoices):
    DRAFT = "draft", "Draft"
    GENERATING = "generating", "Generating"
    READY = "ready", "Ready"
    SCHEDULED = "scheduled", "Scheduled"
    PUBLISHING = "publishing", "Publishing"
    PUBLISHED = "published", "Published"
    FAILED = "failed", "Failed"


# Extensible registry — add facebook, threads, x, pinterest, youtube_shorts later.
SUPPORTED_PLATFORMS = ("linkedin", "instagram", "tiktok")
FUTURE_PLATFORMS = ("facebook", "threads", "x", "pinterest", "youtube_shorts")
