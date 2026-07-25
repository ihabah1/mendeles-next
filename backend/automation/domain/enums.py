"""Automation domain enums."""

from django.db import models


class JobStatus(models.TextChoices):
    QUEUED = "queued", "Queued"
    SCHEDULED = "scheduled", "Scheduled"
    RUNNING = "running", "Running"
    PAUSED = "paused", "Paused"
    WAITING_APPROVAL = "waiting_approval", "Waiting Approval"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"
    RETRYING = "retrying", "Retrying"


class JobPriority(models.TextChoices):
    LOW = "low", "Low"
    NORMAL = "normal", "Normal"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


PRIORITY_ORDER = {
    JobPriority.CRITICAL: 0,
    JobPriority.HIGH: 1,
    JobPriority.NORMAL: 2,
    JobPriority.LOW: 3,
}


class JobType(models.TextChoices):
    # SEO
    KEYWORD_RESEARCH = "keyword_research", "Keyword Research"
    KEYWORD_SYNC = "keyword_sync", "Keyword Sync"
    COMPETITION_SCAN = "competition_scan", "Competition Scan"
    SERP_SCAN = "serp_scan", "SERP Scan"
    SEARCH_CONSOLE_SYNC = "search_console_sync", "Search Console Sync"
    GOOGLE_TRENDS_SYNC = "google_trends_sync", "Google Trends Sync"
    # Content
    GENERATE_LANDING_PAGE = "generate_landing_page", "Generate Landing Page"
    GENERATE_BLOG_ARTICLE = "generate_blog_article", "Generate Blog Article"
    GENERATE_FAQ = "generate_faq", "Generate FAQ"
    GENERATE_METADATA = "generate_metadata", "Generate Metadata"
    GENERATE_SCHEMA = "generate_schema", "Generate Schema"
    GENERATE_INTERNAL_LINKS = "generate_internal_links", "Generate Internal Links"
    GENERATE_ALT_TEXT = "generate_alt_text", "Generate ALT Text"
    TRANSLATE_SITE_PAGES = "translate_site_pages", "Translate Site Pages"
    # Media
    GENERATE_IMAGES = "generate_images", "Generate Images"
    OPTIMIZE_IMAGES = "optimize_images", "Optimize Images"
    COMPRESS_IMAGES = "compress_images", "Compress Images"
    # Publishing
    PUBLISH = "publish", "Publish"
    UNPUBLISH = "unpublish", "Unpublish"
    SCHEDULE_PUBLISHING = "schedule_publishing", "Schedule Publishing"
    ARCHIVE = "archive", "Archive"
    UPDATE_SITEMAP = "update_sitemap", "Update Sitemap"
    PING_SEARCH_ENGINES = "ping_search_engines", "Ping Search Engines"
    # Analytics
    REFRESH_METRICS = "refresh_metrics", "Refresh Metrics"
    GENERATE_REPORTS = "generate_reports", "Generate Reports"
    BROKEN_LINK_SCAN = "broken_link_scan", "Broken Link Scan"
    SEO_AUDIT = "seo_audit", "SEO Audit"
    ACCESSIBILITY_AUDIT = "accessibility_audit", "Accessibility Audit"
    # Marketing
    EMAIL_CAMPAIGN = "email_campaign", "Email Campaign"
    WHATSAPP_CAMPAIGN = "whatsapp_campaign", "WhatsApp Campaign"
    SMS_CAMPAIGN = "sms_campaign", "SMS Campaign"
    LEAD_FOLLOW_UP = "lead_follow_up", "Lead Follow-up"
    SOCIAL_RANDOM_REPUBLISH = "social_random_republish", "Social random republish"
    # System
    BACKUP = "backup", "Backup"
    HEALTH_CHECK = "health_check", "Health Check"
    CLEANUP = "cleanup", "Cleanup"
    CACHE_REFRESH = "cache_refresh", "Cache Refresh"


PUBLISHING_JOB_TYPES = {
    JobType.PUBLISH,
    JobType.SCHEDULE_PUBLISHING,
    JobType.PING_SEARCH_ENGINES,
}

IMPLEMENTED_JOB_TYPES = {
    JobType.HEALTH_CHECK,
    JobType.CLEANUP,
    JobType.CACHE_REFRESH,
    JobType.SEARCH_CONSOLE_SYNC,
    JobType.GOOGLE_TRENDS_SYNC,
    JobType.REFRESH_METRICS,
    JobType.GENERATE_BLOG_ARTICLE,
    JobType.GENERATE_LANDING_PAGE,
    JobType.ACCESSIBILITY_AUDIT,
    JobType.TRANSLATE_SITE_PAGES,
    JobType.SOCIAL_RANDOM_REPUBLISH,
}

GEMINI_JOB_TYPES = {
    JobType.GENERATE_BLOG_ARTICLE.value,
    JobType.GENERATE_LANDING_PAGE.value,
    JobType.TRANSLATE_SITE_PAGES.value,
}


class ScheduleType(models.TextChoices):
    NOW = "now", "Run Now"
    SPECIFIC = "specific", "Specific Date"
    DAILY = "daily", "Daily"
    WEEKLY = "weekly", "Weekly"
    MONTHLY = "monthly", "Monthly"
    EVERY_MINUTES = "every_minutes", "Every X Minutes"
    EVERY_HOURS = "every_hours", "Every X Hours"
    EVERY_DAYS = "every_days", "Every X Days"
    CRON = "cron", "Cron Expression"


class WorkerStatus(models.TextChoices):
    IDLE = "idle", "Idle"
    BUSY = "busy", "Busy"
    OFFLINE = "offline", "Offline"
    PAUSED = "paused", "Paused"


class LogLevel(models.TextChoices):
    DEBUG = "debug", "Debug"
    INFO = "info", "Info"
    WARNING = "warning", "Warning"
    ERROR = "error", "Error"


class NotificationChannel(models.TextChoices):
    IN_APP = "in_app", "In-App"
    EMAIL = "email", "Email"
    WHATSAPP = "whatsapp", "WhatsApp"
    PUSH = "push", "Push"


class NotificationType(models.TextChoices):
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    APPROVAL_REQUIRED = "approval_required", "Approval Required"
    CANCELLED = "cancelled", "Cancelled"
    STARTED = "started", "Started"


class StepStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    SKIPPED = "skipped", "Skipped"
    WAITING_APPROVAL = "waiting_approval", "Waiting Approval"
