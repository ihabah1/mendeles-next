from social.application.generation_service import CampaignGenerationService
from social.providers.base import PLATFORM_ALIASES, PLATFORM_SERVICE_MAP, PublishPayload
from social.providers.buffer import BufferPublisher


def test_generate_fallback_without_gemini(settings):
    settings.GEMINI_API_KEY = ""
    result = CampaignGenerationService.generate(
        {
            "goal": "Increase demo bookings",
            "campaign_type": "product",
            "tone": "curious",
            "target_audience": "agencies",
            "website_url": "https://mendeles.com",
            "media_type": "video",
            "platforms": ["linkedin", "tiktok"],
        }
    )
    assert result["title"]
    assert "linkedin" in result["captions"]
    assert "tiktok" in result["captions"]
    assert "instagram" not in result["captions"]
    assert result["video_prompt"]
    assert result["hashtags"]["linkedin"]


def test_platform_aliases_ready_for_future_networks():
    assert "facebook" in PLATFORM_ALIASES
    assert "youtube_shorts" in PLATFORM_ALIASES
    assert "linkedin" in PLATFORM_ALIASES
    assert "bluesky" in PLATFORM_SERVICE_MAP
    assert "threads" in PLATFORM_SERVICE_MAP


def test_buffer_publisher_not_configured_without_token(monkeypatch):
    monkeypatch.delenv("BUFFER_ACCESS_TOKEN", raising=False)
    BufferPublisher.clear_cache()
    publisher = BufferPublisher(access_token="")
    assert publisher.configured() is False


def test_resolve_channel_by_platform_and_name(monkeypatch):
    BufferPublisher.clear_cache()
    publisher = BufferPublisher(access_token="test-token")
    channels = [
        {
            "id": "ig1",
            "service": "instagram",
            "name": "mendeles_main",
            "display_name": "Mendeles",
            "label": "Mendeles",
            "descriptor": "Instagram Business",
            "type": "business",
            "is_disconnected": False,
            "is_locked": False,
        },
        {
            "id": "ig2",
            "service": "instagram",
            "name": "mendeles_stories",
            "display_name": "Mendeles Stories",
            "label": "Mendeles Stories",
            "descriptor": "Instagram Business",
            "type": "business",
            "is_disconnected": False,
            "is_locked": False,
        },
        {
            "id": "li1",
            "service": "linkedin",
            "name": "mendeles",
            "display_name": "Mendeles HQ",
            "label": "Mendeles HQ",
            "descriptor": "LinkedIn Page",
            "type": "page",
            "is_disconnected": False,
            "is_locked": False,
        },
    ]
    monkeypatch.setattr(publisher, "list_channels", lambda force_refresh=False: channels)

    assert publisher.resolve_channel("instagram", channels=channels)["id"] == "ig1"
    assert publisher.resolve_channel("instagram", channel_name="stories", channels=channels)["id"] == "ig2"
    assert publisher.resolve_channel("linkedin", channels=channels)["id"] == "li1"
    assert publisher.resolve_channel("tiktok", channels=channels) is None

    summary = publisher.connected_platform_summary(channels)
    assert "instagram" in summary and "linkedin" in summary


def test_publish_uses_graphql_create_post(monkeypatch):
    BufferPublisher.clear_cache()
    publisher = BufferPublisher(access_token="test-token")
    channels = [
        {
            "id": "li1",
            "service": "linkedin",
            "name": "mendeles",
            "display_name": "Mendeles HQ",
            "label": "Mendeles HQ",
            "descriptor": "LinkedIn Page",
            "type": "page",
            "is_disconnected": False,
            "is_locked": False,
        }
    ]
    monkeypatch.setattr(publisher, "list_channels", lambda force_refresh=False: channels)

    calls = {}

    def fake_graphql(query, variables=None):
        calls["query"] = query
        calls["variables"] = variables
        return {"createPost": {"post": {"id": "post123", "text": "hi", "status": "buffer"}}}

    monkeypatch.setattr(publisher, "_graphql", fake_graphql)

    result = publisher.publish(
        PublishPayload(text="Hello", platform="linkedin", now=True, media_url="https://cdn.example/a.png")
    )
    assert result.ok
    assert result.external_id == "post123"
    assert result.channel_id == "li1"
    assert "createPost" in calls["query"]
    assert calls["variables"]["input"]["mode"] == "shareNow"
    assert calls["variables"]["input"]["channelId"] == "li1"
    assert calls["variables"]["input"]["assets"][0]["image"]["url"] == "https://cdn.example/a.png"


def test_publish_instagram_includes_post_type_metadata(monkeypatch):
    BufferPublisher.clear_cache()
    publisher = BufferPublisher(access_token="test-token")
    channels = [
        {
            "id": "ig1",
            "service": "instagram",
            "name": "mendeles",
            "display_name": "Mendeles",
            "label": "Mendeles",
            "descriptor": "Instagram Business",
            "type": "business",
            "is_disconnected": False,
            "is_locked": False,
        }
    ]
    monkeypatch.setattr(publisher, "list_channels", lambda force_refresh=False: channels)
    calls = {}

    def fake_graphql(query, variables=None):
        calls["variables"] = variables
        return {"createPost": {"post": {"id": "igpost1", "text": "hi", "status": "buffer"}}}

    monkeypatch.setattr(publisher, "_graphql", fake_graphql)
    result = publisher.publish(
        PublishPayload(
            text="Hello IG",
            platform="instagram",
            now=True,
            media_url="https://mendeles.com/media/social/a.png",
            media_kind="image",
            instagram_type="post",
        )
    )
    assert result.ok
    meta = calls["variables"]["input"]["metadata"]["instagram"]
    assert meta["type"] == "post"
    assert meta["shouldShareToFeed"] is True
    assert calls["variables"]["input"]["assets"][0]["image"]["url"].endswith("/media/social/a.png")


def test_public_media_url_rewrites_to_frontend(settings):
    from social.application.media_service import public_media_url_for_buffer

    settings.FRONTEND_URL = "https://mendeles.com"
    settings.BACKEND_PUBLIC_URL = "https://api.example.railway.app"
    assert (
        public_media_url_for_buffer("https://api.example.railway.app/media/social/x.png")
        == "https://mendeles.com/media/social/x.png"
    )
    assert public_media_url_for_buffer("/media/social/y.jpg") == "https://mendeles.com/media/social/y.jpg"


def test_publish_missing_platform_lists_connected(monkeypatch):
    BufferPublisher.clear_cache()
    publisher = BufferPublisher(access_token="test-token")
    channels = [
        {
            "id": "li1",
            "service": "linkedin",
            "name": "mendeles",
            "display_name": "Mendeles HQ",
            "label": "Mendeles HQ",
            "descriptor": "LinkedIn Page",
            "type": "page",
            "is_disconnected": False,
            "is_locked": False,
        }
    ]
    monkeypatch.setattr(publisher, "list_channels", lambda force_refresh=False: channels)

    result = publisher.publish(PublishPayload(text="x", platform="tiktok", now=True))
    assert result.ok is False
    assert "tiktok" in result.error.lower()
    assert "linkedin" in result.error.lower()
    assert "BUFFER_PROFILE" not in result.error


def test_simulation_required_before_publish(tenant, owner_user, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    settings.BACKEND_PUBLIC_URL = "http://backend.test"
    settings.FRONTEND_URL = "https://mendeles.com"
    from social.application.campaign_service import CampaignService
    from social.domain.enums import CampaignStatus
    from social.infrastructure.models import SocialCampaign

    campaign = SocialCampaign.objects.create(
        tenant=tenant,
        created_by=owner_user,
        title="Demo push",
        goal="Book demos",
        website_url="https://mendeles.com",
        platforms=["linkedin", "instagram"],
        captions_json={
            "linkedin": "LI caption",
            "instagram": "IG caption",
        },
        hashtags_json={"linkedin": ["#a"], "instagram": ["#b"]},
        cta="Book a demo",
        status=CampaignStatus.READY,
    )

    blocked = CampaignService.publish(campaign, schedule=False)
    assert blocked["status"] == CampaignStatus.FAILED
    assert "Simulation required" in blocked["last_error"]

    # Without a real PNG (Gemini unavailable → SVG), simulation must fail the PNG gate.
    simulated = CampaignService.run_simulation(campaign)
    assert simulated["status"] == CampaignStatus.READY
    assert any(s["step"] == "Campaign PNG creative" and not s["ok"] for s in simulated["simulation_log"])

    # Real PNG creative unlocks simulation.
    media_dir = tmp_path / "social"
    media_dir.mkdir(parents=True, exist_ok=True)
    png = media_dir / "demo.png"
    png.write_bytes(b"\x89PNG\r\n\x1a\nfake")
    campaign.instagram_image_url = "http://backend.test/media/social/demo.png"
    campaign.media_url = campaign.instagram_image_url
    campaign.save(update_fields=["instagram_image_url", "media_url", "updated_at"])
    simulated_ok = CampaignService.run_simulation(campaign)
    assert simulated_ok["status"] == CampaignStatus.SIMULATED
    assert any(s["step"] == "Campaign PNG creative" and s["ok"] for s in simulated_ok["simulation_log"])


def test_publish_blocks_without_png(tenant, owner_user, settings, tmp_path, monkeypatch):
    settings.MEDIA_ROOT = tmp_path
    settings.BACKEND_PUBLIC_URL = "http://backend.test"
    settings.FRONTEND_URL = "https://mendeles.com"
    monkeypatch.setenv("BUFFER_ACCESS_TOKEN", "tok")
    from django.utils import timezone as dj_tz

    from social.application.campaign_service import CampaignService
    from social.application.media_service import MISSING_PNG_MESSAGE
    from social.domain.enums import CampaignStatus
    from social.infrastructure.models import SocialCampaign
    from social.providers.buffer import BufferPublisher

    BufferPublisher.clear_cache()
    publisher = BufferPublisher(access_token="tok")
    monkeypatch.setattr("social.application.campaign_service.get_default_publisher", lambda: publisher)
    monkeypatch.setattr(
        publisher,
        "list_channels",
        lambda force_refresh=False: [
            {
                "id": "li1",
                "service": "linkedin",
                "name": "x",
                "display_name": "x",
                "label": "x",
                "type": "page",
                "is_disconnected": False,
                "is_locked": False,
            }
        ],
    )

    campaign = SocialCampaign.objects.create(
        tenant=tenant,
        created_by=owner_user,
        title="No PNG",
        platforms=["linkedin"],
        captions_json={"linkedin": "hi"},
        instagram_image_url="http://backend.test/media/social/x.svg",
        media_url="http://backend.test/media/social/x.svg",
        status=CampaignStatus.SIMULATED,
        simulated_at=dj_tz.now(),
    )
    result = CampaignService.publish(campaign, schedule=False)
    assert result["status"] == CampaignStatus.FAILED
    assert "PNG" in result["last_error"] or MISSING_PNG_MESSAGE[:20] in result["last_error"]


def test_tiktok_simulation_auto_creates_creative(tenant, owner_user, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    settings.BACKEND_PUBLIC_URL = "http://backend.test"
    settings.FRONTEND_URL = "https://mendeles.com"
    from social.application.campaign_service import CampaignService
    from social.domain.enums import CampaignStatus
    from social.infrastructure.models import SocialCampaign

    campaign = SocialCampaign.objects.create(
        tenant=tenant,
        created_by=owner_user,
        title="TikTok push",
        goal="Views",
        website_url="https://mendeles.com",
        platforms=["tiktok"],
        captions_json={"tiktok": "Hook caption"},
        hashtags_json={"tiktok": ["#mendeles"]},
        # Photo posts without MP4 still need a real PNG for Buffer.
        instagram_image_url="http://backend.test/media/social/demo.png",
        media_url="http://backend.test/media/social/demo.png",
        status=CampaignStatus.READY,
    )
    result = CampaignService.run_simulation(campaign)
    assert result["status"] == CampaignStatus.SIMULATED
    assert result["tiktok_video_url"]
    assert any(s["step"] == "TikTok video" and s["ok"] for s in result["simulation_log"])
    assert any(s["step"] == "Campaign PNG creative" and s["ok"] for s in result["simulation_log"])


def test_bootstrap_creatives_on_generate(tenant, owner_user, settings, tmp_path, monkeypatch):
    settings.MEDIA_ROOT = tmp_path
    settings.BACKEND_PUBLIC_URL = "http://backend.test"
    from social.application.campaign_service import CampaignService
    from social.application.media_service import MediaGenerationService
    from social.domain.enums import CampaignStatus
    from social.infrastructure.models import SocialCampaign

    campaign = SocialCampaign.objects.create(
        tenant=tenant,
        created_by=owner_user,
        title="Bootstrap",
        goal="Demos",
        website_url="https://mendeles.com",
        platforms=["instagram", "tiktok"],
        media_url="https://placehold.co/1080x1080",
        status=CampaignStatus.READY,
    )

    def fake_ig(c):
        c.instagram_image_url = "http://backend.test/media/social/ig.svg"
        c.media_url = c.instagram_image_url
        c.save(update_fields=["instagram_image_url", "media_url", "updated_at"])
        return c.instagram_image_url

    def fake_tt(c):
        c.tiktok_video_url = "http://backend.test/media/social/tt.svg"
        c.save(update_fields=["tiktok_video_url", "updated_at"])
        return c.tiktok_video_url

    monkeypatch.setattr(MediaGenerationService, "create_instagram_image", staticmethod(fake_ig))
    monkeypatch.setattr(MediaGenerationService, "create_tiktok_creative", staticmethod(fake_tt))

    result = CampaignService.bootstrap_creatives(campaign, tiktok_count=3)
    assert result.instagram_image_url.endswith("ig.svg")
    assert result.tiktok_video_url.endswith("tt.svg")
    assert result.media_url == result.instagram_image_url


def test_create_instagram_image_uses_gemini_when_available(tenant, owner_user, settings, tmp_path, monkeypatch):
    settings.MEDIA_ROOT = tmp_path
    settings.BACKEND_PUBLIC_URL = "http://backend.test"
    settings.GEMINI_API_KEY = "test-key"

    from ai_seo.application.gemini_service import GeminiService
    from social.application.media_service import MediaGenerationService
    from social.domain.enums import CampaignStatus
    from social.infrastructure.models import SocialCampaign

    campaign = SocialCampaign.objects.create(
        tenant=tenant,
        created_by=owner_user,
        title="Attractive growth",
        goal="Demos",
        media_prompt="Cinematic violet AI dashboard glow",
        website_url="https://mendeles.com",
        platforms=["instagram"],
        status=CampaignStatus.READY,
    )

    monkeypatch.setattr(
        GeminiService,
        "generate_image",
        classmethod(lambda cls, prompt, *, aspect_ratio="1:1": (b"\x89PNG-fake", "image/png")),
    )

    url = MediaGenerationService.create_instagram_image(campaign)
    campaign.refresh_from_db()
    assert url.endswith(".png")
    assert campaign.instagram_image_url == url
    assert campaign.media_url == url
    assert (tmp_path / "social").exists()


def test_save_tiktok_video_accepts_codecs_in_data_url(tenant, owner_user, settings, tmp_path):
    """Browser MediaRecorder emits codecs= in the data URL; upload must accept it."""
    import base64

    settings.MEDIA_ROOT = tmp_path
    settings.BACKEND_PUBLIC_URL = "http://backend.test"

    from social.application.media_service import MediaGenerationService
    from social.domain.enums import CampaignStatus
    from social.infrastructure.models import SocialCampaign

    campaign = SocialCampaign.objects.create(
        tenant=tenant,
        created_by=owner_user,
        title="TikTok codecs",
        goal="Leads",
        website_url="https://mendeles.com",
        platforms=["tiktok"],
        status=CampaignStatus.READY,
        media_type="video",
    )
    payload = b"\x1a\x45\xdf\xa3" + (b"\x00" * 128)  # tiny webm-like bytes
    b64 = base64.b64encode(payload).decode("ascii")
    data_url = f"data:video/webm;codecs=vp9,opus;base64,{b64}"

    url = MediaGenerationService.save_tiktok_video(campaign, data_url=data_url, provider="browser")
    campaign.refresh_from_db()
    assert url.endswith(".webm")
    assert campaign.tiktok_video_url == url
    assert len(campaign.tiktok_videos_json or []) == 1

def test_attach_site_promo_videos(tenant, owner_user, settings):
    settings.FRONTEND_URL = "https://mendeles.com"
    from social.application.media_service import MediaGenerationService
    from social.domain.enums import CampaignStatus
    from social.infrastructure.models import SocialCampaign

    campaign = SocialCampaign.objects.create(
        tenant=tenant,
        created_by=owner_user,
        title="Promo attach",
        platforms=["tiktok"],
        status=CampaignStatus.READY,
        media_type="video",
    )
    urls = MediaGenerationService.attach_site_promo_videos(campaign, ["logo", "landing-page"])
    campaign.refresh_from_db()
    assert urls == [
        "https://mendeles.com/videos/logo.mp4",
        "https://mendeles.com/videos/landing-page.mp4",
    ]
    assert campaign.tiktok_video_url == urls[0]
    assert all(v.get("provider") == "site_promo" for v in campaign.tiktok_videos_json)
