import pytest
from django.core.cache import cache

from social.providers.video import VideoProviderOrchestrator, build_providers
from social.providers.video.base import (
    VideoCreditsExhausted,
    VideoGenerationRequest,
    VideoGenerationResult,
    VideoProvider,
)
from social.providers.video.local import LocalFallbackVideoProvider


class _FakeProvider(VideoProvider):
    def __init__(self, name: str, *, credits: int, fail: str | None = None):
        self._name = name
        self._credits = credits
        self._fail = fail
        self.calls = 0

    @property
    def name(self) -> str:
        return self._name

    def is_configured(self) -> bool:
        return True

    def cost_per_video(self) -> int:
        return 1

    def credits_remaining(self) -> int | None:
        return self._credits

    def generate(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        self.calls += 1
        if self._fail == "credits":
            raise VideoCreditsExhausted(f"{self._name} empty")
        if self._fail == "error":
            raise RuntimeError(f"{self._name} boom")
        self._credits -= 1
        return VideoGenerationResult(
            ok=True,
            provider=self._name,
            video_bytes=b"fake-mp4",
            content_type="video/mp4",
            credits_used=1,
        )


def test_failover_skips_empty_credits_and_uses_next():
    runway = _FakeProvider("runway", credits=0)
    fal = _FakeProvider("fal", credits=2)
    orch = VideoProviderOrchestrator([runway, fal, LocalFallbackVideoProvider()])
    result = orch.generate(VideoGenerationRequest(prompt="Mendeles promo"))
    assert result.ok is True
    assert result.provider == "fal"
    assert runway.calls == 0
    assert fal.calls == 1


def test_failover_on_runtime_error():
    runway = _FakeProvider("runway", credits=5, fail="error")
    fal = _FakeProvider("fal", credits=5)
    orch = VideoProviderOrchestrator([runway, fal])
    result = orch.generate(VideoGenerationRequest(prompt="x"))
    assert result.ok is True
    assert result.provider == "fal"
    assert runway.calls == 1


def test_local_always_available_last():
    providers = build_providers(["local"])
    assert providers[0].name == "local"
    assert providers[0].credit_status().available is True


@pytest.mark.django_db
def test_generate_ai_tiktok_batch(tenant, owner_user, settings, tmp_path):
    cache.clear()
    settings.MEDIA_ROOT = tmp_path
    settings.BACKEND_PUBLIC_URL = "http://backend.test"
    settings.VIDEO_PROVIDERS_MOCK = True
    settings.RUNWAY_API_KEY = ""
    settings.FAL_KEY = ""
    settings.VEO_API_KEY = ""
    settings.LTX_API_KEY = ""
    settings.KLING_API_KEY = ""

    from social.application.media_service import MediaGenerationService
    from social.domain.enums import CampaignStatus
    from social.infrastructure.models import SocialCampaign

    campaign = SocialCampaign.objects.create(
        tenant=tenant,
        created_by=owner_user,
        title="Mendeles growth",
        goal="More demos",
        website_url="https://mendeles.com",
        video_prompt="Vertical promo for Mendeles AI tools",
        platforms=["tiktok"],
        status=CampaignStatus.READY,
    )
    batch = MediaGenerationService.generate_ai_tiktok_videos(campaign, count=3)
    campaign.refresh_from_db()
    assert batch["generated"] == 3
    assert len(campaign.tiktok_videos_json) == 3
    assert campaign.tiktok_video_url
