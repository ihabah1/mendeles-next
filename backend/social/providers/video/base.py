"""Multi-vendor TikTok / short-form video generation providers."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


class VideoProviderError(RuntimeError):
    """Base provider failure."""


class VideoCreditsExhausted(VideoProviderError):
    """Provider has no remaining credits."""


class VideoProviderNotConfigured(VideoProviderError):
    """API key / config missing."""


@dataclass
class VideoGenerationRequest:
    prompt: str
    title: str = ""
    cta: str = ""
    website_url: str = ""
    aspect_ratio: str = "9:16"
    duration_seconds: int = 5
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class VideoGenerationResult:
    ok: bool
    provider: str
    video_bytes: bytes = b""
    content_type: str = "video/mp4"
    remote_url: str = ""
    external_id: str = ""
    credits_used: int = 0
    error: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "provider": self.provider,
            "content_type": self.content_type,
            "remote_url": self.remote_url,
            "external_id": self.external_id,
            "credits_used": self.credits_used,
            "error": self.error,
            "has_bytes": bool(self.video_bytes),
            "metadata": self.metadata,
        }


@dataclass
class ProviderCreditStatus:
    provider: str
    configured: bool
    credits_remaining: int | None
    available: bool
    message: str = ""
    cost_per_video: int = 1

    def to_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "configured": self.configured,
            "credits_remaining": self.credits_remaining,
            "available": self.available,
            "message": self.message,
            "cost_per_video": self.cost_per_video,
        }


class VideoProvider(ABC):
    """Abstract video generation vendor (Runway, Fal, Veo, LTX, Kling, …)."""

    @property
    @abstractmethod
    def name(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def is_configured(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def cost_per_video(self) -> int:
        raise NotImplementedError

    @abstractmethod
    def credits_remaining(self) -> int | None:
        """Return remaining credits, or None if unknown but configured."""

    def credit_status(self) -> ProviderCreditStatus:
        configured = self.is_configured()
        if not configured:
            return ProviderCreditStatus(
                provider=self.name,
                configured=False,
                credits_remaining=0,
                available=False,
                message="Not configured",
                cost_per_video=self.cost_per_video(),
            )
        remaining = self.credits_remaining()
        cost = self.cost_per_video()
        if remaining is None:
            available = True
            message = "Configured (balance unknown)"
        elif remaining < cost:
            available = False
            message = "Insufficient credits"
        else:
            available = True
            message = "Ready"
        return ProviderCreditStatus(
            provider=self.name,
            configured=True,
            credits_remaining=remaining,
            available=available,
            message=message,
            cost_per_video=cost,
        )

    @abstractmethod
    def generate(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        raise NotImplementedError
