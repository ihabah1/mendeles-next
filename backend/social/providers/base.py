"""Extensible social publisher adapters. Buffer GraphQL is the first implementation."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class PublishPayload:
    text: str
    platform: str
    media_url: str = ""
    media_kind: str = "image"  # image | video
    instagram_type: str = "post"  # post | story | reel
    scheduled_at_iso: str | None = None
    now: bool = True
    channel_name: str | None = None


@dataclass
class PublishResult:
    ok: bool
    platform: str
    external_id: str = ""
    error: str = ""
    raw: dict[str, Any] = field(default_factory=dict)
    channel_id: str = ""
    channel_name: str = ""


class SocialPublisher(ABC):
    """Provider-agnostic publisher. Add more networks as new subclasses."""

    @abstractmethod
    def configured(self) -> bool:
        ...

    @abstractmethod
    def list_channels(self, *, force_refresh: bool = False) -> list[dict[str, Any]]:
        ...

    @abstractmethod
    def publish(self, payload: PublishPayload) -> PublishResult:
        ...

    # Back-compat alias used by older callers / status views
    def list_profiles(self) -> list[dict[str, Any]]:
        return self.list_channels()


# Map Mendeles platform keys → Buffer GraphQL `service` enum values (lowercase).
# Extensible: add facebook, threads, x, youtube, bluesky, etc. without changing core publish flow.
PLATFORM_SERVICE_MAP: dict[str, tuple[str, ...]] = {
    "linkedin": ("linkedin",),
    "instagram": ("instagram",),
    "tiktok": ("tiktok",),
    "facebook": ("facebook",),
    "threads": ("threads",),
    "x": ("twitter", "x"),
    "twitter": ("twitter", "x"),
    "youtube": ("youtube",),
    "youtube_shorts": ("youtube",),
    "pinterest": ("pinterest",),
    "bluesky": ("bluesky",),
    "mastodon": ("mastodon",),
    "google_business": ("googlebusiness", "google", "google_business_profile"),
}

# Keep old name for imports that still reference PLATFORM_ALIASES
PLATFORM_ALIASES = PLATFORM_SERVICE_MAP
