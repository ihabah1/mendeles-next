import json
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError
from io import BytesIO

import pytest

from social.providers.base import PublishPayload
from social.providers.composite import CompositeSocialPublisher
from social.providers.facebook import FacebookPublisher


def test_facebook_publisher_not_configured():
    pub = FacebookPublisher(page_id="", access_token="")
    assert not pub.configured()
    result = pub.publish(
        PublishPayload(text="hi", platform="facebook", now=True)
    )
    assert not result.ok
    assert "FACEBOOK_PAGE" in result.error


def test_facebook_publisher_photo_now(monkeypatch):
    pub = FacebookPublisher(page_id="123", access_token="tok", page_name="Mendeles")
    assert pub.configured()
    assert pub.list_channels()[0]["service"] == "facebook"

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            return json.dumps({"id": "123_456"}).encode("utf-8")

    monkeypatch.setattr(
        "urllib.request.urlopen",
        lambda *args, **kwargs: FakeResponse(),
    )
    result = pub.publish(
        PublishPayload(
            text="Hello FB",
            platform="facebook",
            media_url="https://mendeles.com/media/a.png",
            media_kind="image",
            now=True,
        )
    )
    assert result.ok
    assert result.external_id == "123_456"
    assert result.channel_name == "Mendeles"


def test_facebook_publisher_rejects_other_platform():
    pub = FacebookPublisher(page_id="1", access_token="t")
    result = pub.publish(PublishPayload(text="x", platform="linkedin", now=True))
    assert not result.ok


def test_composite_routes_facebook_to_meta():
    buffer = MagicMock()
    buffer.configured.return_value = True
    facebook = MagicMock()
    facebook.configured.return_value = True
    facebook.publish.return_value = MagicMock(ok=True, platform="facebook", external_id="fb1")

    composite = CompositeSocialPublisher(buffer=buffer, facebook=facebook)
    payload = PublishPayload(text="hi", platform="facebook", now=True)
    result = composite.publish(payload)
    facebook.publish.assert_called_once_with(payload)
    buffer.publish.assert_not_called()
    assert result.ok


def test_composite_routes_linkedin_to_buffer():
    buffer = MagicMock()
    buffer.configured.return_value = True
    buffer.publish.return_value = MagicMock(ok=True, platform="linkedin", external_id="b1")
    facebook = MagicMock()
    facebook.configured.return_value = True

    composite = CompositeSocialPublisher(buffer=buffer, facebook=facebook)
    payload = PublishPayload(text="hi", platform="linkedin", now=True)
    result = composite.publish(payload)
    buffer.publish.assert_called_once_with(payload)
    facebook.publish.assert_not_called()
    assert result.ok


def test_facebook_in_supported_platforms():
    from social.domain.enums import SUPPORTED_PLATFORMS

    assert "facebook" in SUPPORTED_PLATFORMS
