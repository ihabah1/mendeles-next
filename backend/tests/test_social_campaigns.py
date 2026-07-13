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
