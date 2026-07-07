"""International news headlines with source URLs — Google News RSS (no API key)."""

from __future__ import annotations

import logging
import re
import xml.etree.ElementTree as ET
from urllib.parse import urlparse
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)

NEWS_RSS_FEEDS: dict[str, str] = {
    "sports": "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en",
    "economy": "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en",
    "world_news": "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en",
    "current_affairs": "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en",
}


def normalize_topic_fingerprint(text: str) -> str:
    """Strip publication suffix and punctuation for duplicate detection."""
    cleaned = re.sub(r"\s*-\s*[^-]+$", "", (text or "").strip())
    cleaned = re.sub(r"[^\w\s\u0590-\u05ff]", " ", cleaned, flags=re.UNICODE)
    return re.sub(r"\s+", " ", cleaned).lower().strip()


def normalize_source_url(url: str) -> str:
    return (url or "").strip().lower()


def fetch_rss_headlines(feed_url: str, *, limit: int = 25) -> list[dict]:
    try:
        request = Request(feed_url, headers={"User-Agent": "MendelesNewsBot/1.0 (+https://mendeles.com)"})
        with urlopen(request, timeout=12) as response:
            payload = response.read()
        root = ET.fromstring(payload)
        items: list[dict] = []
        for node in root.findall(".//item")[:limit]:
            title = (node.findtext("title") or "").strip()
            link = (node.findtext("link") or "").strip()
            if not title or not link:
                continue
            source_node = node.find("source")
            source_name = (source_node.text or "").strip() if source_node is not None else ""
            if not source_name and source_node is not None:
                source_name = (source_node.attrib.get("url") or "").strip()
            if not source_name:
                source_name = urlparse(link).netloc.replace("www.", "")
            items.append(
                {
                    "title": title,
                    "url": link,
                    "source_name": source_name,
                    "published": (node.findtext("pubDate") or "").strip(),
                }
            )
        return items
    except Exception:
        logger.warning("Failed to fetch news RSS: %s", feed_url, exc_info=True)
        return []


def headlines_for_domain(domain_value: str, *, limit: int = 25) -> list[dict]:
    feed_url = NEWS_RSS_FEEDS.get(domain_value)
    if not feed_url:
        return []
    return fetch_rss_headlines(feed_url, limit=limit)
