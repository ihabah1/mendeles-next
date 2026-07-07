import xml.etree.ElementTree as ET

from ai_seo.application.generation_service import AiSeoGenerationService
from ai_seo.application.news_source_service import (
    fetch_rss_headlines,
    normalize_topic_fingerprint,
)
from automation.domain.enums import JobType
from automation.infrastructure.models import AutomationJob
from content.application.block_service import BlockService
from content.domain.status import PageType
from content.infrastructure.models import Page


SAMPLE_RSS = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Premier League title race heats up - BBC Sport</title>
      <link>https://news.google.com/articles/example-sports</link>
      <source url="https://www.bbc.co.uk">BBC Sport</source>
      <pubDate>Sun, 07 Jul 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Global markets rally on rate cut hopes - Reuters</title>
      <link>https://news.google.com/articles/example-economy</link>
      <source url="https://www.reuters.com">Reuters</source>
    </item>
  </channel>
</rss>"""


def test_normalize_topic_fingerprint_strips_source_suffix():
    assert normalize_topic_fingerprint("Premier League title race heats up - BBC Sport") == normalize_topic_fingerprint(
        "premier league title race heats up"
    )


def test_fetch_rss_headlines_parses_items(monkeypatch):
    class FakeResponse:
        def read(self):
            return SAMPLE_RSS

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    monkeypatch.setattr("ai_seo.application.news_source_service.urlopen", lambda *args, **kwargs: FakeResponse())
    items = fetch_rss_headlines("https://example.com/feed")
    assert len(items) == 2
    assert items[0]["url"] == "https://news.google.com/articles/example-sports"
    assert items[0]["source_name"] == "BBC Sport"


def test_resolve_news_event_prefers_rss_with_source_url(tenant, monkeypatch):
    monkeypatch.setattr(
        "ai_seo.application.generation_service.headlines_for_domain",
        lambda domain_value, limit=25: [
            {
                "title": "Premier League title race heats up - BBC Sport",
                "url": "https://news.google.com/articles/example-sports",
                "source_name": "BBC Sport",
                "published": "",
            }
        ]
        if domain_value == "sports"
        else [],
    )
    event = AiSeoGenerationService._resolve_news_event(
        tenant.id,
        {"value": "sports", "label": "ספורט", "keywords": ["ספורט"]},
        ["ספורט"],
    )
    assert event is not None
    assert event["source"] == "google_news_rss"
    assert event["source_url"] == "https://news.google.com/articles/example-sports"
    assert event["source_name"] == "BBC Sport"


def test_resolve_news_event_skips_duplicate_source_url(tenant, monkeypatch, owner_user):
    monkeypatch.setattr(
        "ai_seo.application.generation_service.headlines_for_domain",
        lambda domain_value, limit=25: [
            {
                "title": "Premier League title race heats up - BBC Sport",
                "url": "https://news.google.com/articles/example-sports",
                "source_name": "BBC Sport",
                "published": "",
            },
            {
                "title": "Champions League draw announced - ESPN",
                "url": "https://news.google.com/articles/example-sports-2",
                "source_name": "ESPN",
                "published": "",
            },
        ],
    )
    page = Page.objects.create(
        tenant=tenant,
        title="Premier League title race heats up - BBC Sport",
        slug="sports-dup",
        full_path="/blog/sports-dup",
        page_type=PageType.BLOG,
        locale="he",
        created_by=owner_user,
    )
    BlockService.create_block(
        page,
        {
            "block_type": "source_link",
            "sort_order": 1,
            "config": {
                "url": "https://news.google.com/articles/example-sports",
                "topic": "Premier League title race heats up - BBC Sport",
            },
        },
    )
    event = AiSeoGenerationService._resolve_news_event(
        tenant.id,
        {"value": "sports", "label": "ספורט", "keywords": ["ספורט"]},
        ["ספורט"],
    )
    assert event is not None
    assert event["source_url"] == "https://news.google.com/articles/example-sports-2"


def test_create_page_adds_source_link_block(tenant, owner_user, monkeypatch):
    from automation.infrastructure.models import AutomationQueue

    queue, _ = AutomationQueue.objects.get_or_create(tenant=tenant, slug="default", defaults={"name": "Default", "is_default": True})
    job = AutomationJob.objects.create(
        tenant=tenant,
        queue=queue,
        name="News article",
        job_type=JobType.GENERATE_BLOG_ARTICLE,
        created_by=owner_user,
        config={
            "output_type": "blog",
            "locale": "he",
            "domain": {"value": "sports", "label": "ספורט"},
            "news_event": {
                "topic": "Premier League title race heats up",
                "source_url": "https://news.google.com/articles/example-sports",
                "source_name": "BBC Sport",
            },
            "free_image_enabled": False,
        },
    )
    page = AiSeoGenerationService._create_page_from_payload(
        job,
        {
            "title": "מירוץ האליפות בליגה האנגלית",
            "meta_title": "מירוץ האליפות בליגה האנגלית",
            "meta_description": "סיכום",
            "blocks": [{"type": "rich_text", "config": {"html": "<p>תוכן</p>"}}],
        },
    )
    source_block = page.blocks.filter(block_type="source_link", deleted_at__isnull=True).first()
    assert source_block is not None
    assert source_block.config["url"] == "https://news.google.com/articles/example-sports"
    assert source_block.config["label"] == "BBC Sport"
