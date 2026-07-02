"""Lead lifecycle statuses."""

from django.db import models


class LeadStatus(models.TextChoices):
    NEW = "new", "New"
    CONTACTED = "contacted", "Contacted"
    QUALIFIED = "qualified", "Qualified"
    UNQUALIFIED = "unqualified", "Unqualified"
    CONVERTED = "converted", "Converted"
    CLOSED = "closed", "Closed"
    ARCHIVED = "archived", "Archived"


class LeadActivityType(models.TextChoices):
    CREATED = "created", "Created"
    STATUS_CHANGED = "status_changed", "Status changed"
    NOTE_ADDED = "note_added", "Note added"
    ASSIGNED = "assigned", "Assigned"
    EXPORTED = "exported", "Exported"
    FORM_SUBMITTED = "form_submitted", "Form submitted"
    UPDATED = "updated", "Updated"


class DuplicatePolicy(models.TextChoices):
    ALLOW = "allow", "Allow duplicates"
    REJECT_EMAIL_24H = "reject_email_24h", "Reject duplicate email within 24h"
    REJECT_PHONE_24H = "reject_phone_24h", "Reject duplicate phone within 24h"
