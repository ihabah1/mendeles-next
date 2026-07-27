"""Route platforms: Buffer for LinkedIn/Instagram/TikTok, Meta Graph for Facebook."""

from __future__ import annotations

from typing import Any

from social.providers.base import PublishPayload, PublishResult, SocialPublisher
from social.providers.buffer import BufferPublisher
from social.providers.facebook import FacebookPublisher


class CompositeSocialPublisher(SocialPublisher):
    """
    Buffer is capped at 3 connected channels — Facebook publishes directly via Meta
    so campaigns can still reach a Facebook Page without consuming a Buffer slot.
    """

    BUFFER_PLATFORMS = frozenset({"linkedin", "instagram", "tiktok"})
    FACEBOOK_PLATFORMS = frozenset({"facebook"})

    def __init__(
        self,
        *,
        buffer: BufferPublisher | None = None,
        facebook: FacebookPublisher | None = None,
    ):
        self.buffer = buffer or BufferPublisher()
        self.facebook = facebook or FacebookPublisher()

    def configured(self) -> bool:
        return self.buffer.configured() or self.facebook.configured()

    def list_channels(self, *, force_refresh: bool = False) -> list[dict[str, Any]]:
        channels: list[dict[str, Any]] = []
        if self.buffer.configured():
            try:
                for ch in self.buffer.list_channels(force_refresh=force_refresh):
                    channels.append({**ch, "provider": ch.get("provider") or "buffer"})
            except Exception:
                pass
        if self.facebook.configured():
            channels.extend(self.facebook.list_channels(force_refresh=force_refresh))
        return channels

    def publish(self, payload: PublishPayload) -> PublishResult:
        if payload.platform in self.FACEBOOK_PLATFORMS:
            return self.facebook.publish(payload)
        if payload.platform in self.BUFFER_PLATFORMS:
            if not self.buffer.configured():
                return PublishResult(
                    ok=False,
                    platform=payload.platform,
                    error="BUFFER_ACCESS_TOKEN is not configured on the server.",
                )
            return self.buffer.publish(payload)
        return PublishResult(
            ok=False,
            platform=payload.platform,
            error=f"No publisher configured for platform '{payload.platform}'.",
        )
