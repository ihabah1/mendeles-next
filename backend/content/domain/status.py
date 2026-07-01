"""Content lifecycle statuses and publishing workflow states."""

from django.db import models


class PageStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    IN_REVIEW = "in_review", "In review"
    SCHEDULED = "scheduled", "Scheduled"
    PUBLISHED = "published", "Published"
    UNPUBLISHED = "unpublished", "Unpublished"
    ARCHIVED = "archived", "Archived"


class PageType(models.TextChoices):
    LANDING_PAGE = "landing_page", "Landing page"
    BLOG = "blog", "Blog article"
    RESOURCE = "resource", "Resource"
    INDUSTRY = "industry", "Industry"
    TEMPLATE_PREVIEW = "template_preview", "Template preview"


# Valid status transitions for publishing workflow
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    PageStatus.DRAFT: {PageStatus.IN_REVIEW, PageStatus.PUBLISHED, PageStatus.ARCHIVED},
    PageStatus.IN_REVIEW: {PageStatus.DRAFT, PageStatus.SCHEDULED, PageStatus.PUBLISHED, PageStatus.ARCHIVED},
    PageStatus.SCHEDULED: {PageStatus.DRAFT, PageStatus.PUBLISHED, PageStatus.ARCHIVED},
    PageStatus.PUBLISHED: {PageStatus.UNPUBLISHED, PageStatus.ARCHIVED},
    PageStatus.UNPUBLISHED: {PageStatus.DRAFT, PageStatus.PUBLISHED, PageStatus.ARCHIVED},
    PageStatus.ARCHIVED: {PageStatus.DRAFT},
}


def can_transition(from_status: str, to_status: str) -> bool:
    return to_status in ALLOWED_TRANSITIONS.get(from_status, set())
