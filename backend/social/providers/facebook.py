"""Direct Facebook Page publisher via Meta Graph API — independent of Buffer's 3-channel limit."""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone as dt_timezone
from typing import Any

from social.providers.base import PublishPayload, PublishResult, SocialPublisher

logger = logging.getLogger(__name__)

GRAPH_VERSION = "v21.0"
GRAPH_BASE = f"https://graph.facebook.com/{GRAPH_VERSION}"


class FacebookPublisher(SocialPublisher):
    """
    Publishes to a Facebook Page using a long-lived Page access token.

    Env:
      FACEBOOK_PAGE_ID
      FACEBOOK_PAGE_ACCESS_TOKEN
      FACEBOOK_PAGE_NAME (optional label for status UI)
    """

    def __init__(
        self,
        *,
        page_id: str | None = None,
        access_token: str | None = None,
        page_name: str | None = None,
    ):
        self.page_id = (page_id or os.environ.get("FACEBOOK_PAGE_ID") or "").strip()
        self.access_token = (
            access_token or os.environ.get("FACEBOOK_PAGE_ACCESS_TOKEN") or ""
        ).strip()
        self.page_name = (
            page_name
            or os.environ.get("FACEBOOK_PAGE_NAME")
            or "Facebook Page"
        ).strip()

    def configured(self) -> bool:
        return bool(self.page_id and self.access_token)

    def list_channels(self, *, force_refresh: bool = False) -> list[dict[str, Any]]:
        if not self.configured():
            return []
        return [
            {
                "id": self.page_id,
                "service": "facebook",
                "name": self.page_name,
                "display_name": self.page_name,
                "label": self.page_name,
                "type": "page",
                "is_disconnected": False,
                "is_locked": False,
                "formatted_username": self.page_name,
                "provider": "meta_graph",
            }
        ]

    def publish(self, payload: PublishPayload) -> PublishResult:
        if payload.platform != "facebook":
            return PublishResult(
                ok=False,
                platform=payload.platform,
                error=f"FacebookPublisher only handles facebook (got {payload.platform}).",
            )
        if not self.configured():
            return PublishResult(
                ok=False,
                platform="facebook",
                error=(
                    "Facebook לא מוגדר. הגדירו FACEBOOK_PAGE_ID ו־FACEBOOK_PAGE_ACCESS_TOKEN "
                    "בשרת (טוקן Page ארוך־טווח מ־Meta)."
                ),
            )

        scheduled_unix = self._parse_schedule_unix(payload.scheduled_at_iso) if not payload.now else None
        if not payload.now and scheduled_unix is None:
            return PublishResult(
                ok=False,
                platform="facebook",
                error="Invalid scheduled_at for Facebook.",
            )

        try:
            if payload.media_url and payload.media_kind == "video":
                try:
                    data = self._publish_video(payload, scheduled_unix=scheduled_unix)
                except Exception as exc:  # noqa: BLE001
                    if self._is_video_permission_error(exc):
                        logger.warning(
                            "facebook_video_permission_denied_fallback_to_feed page_id=%s",
                            self.page_id,
                        )
                        # Some pages/apps can publish posts but not videos.
                        # Fall back to text-only post so campaign can still complete.
                        data = self._publish_feed(payload, scheduled_unix=scheduled_unix)
                    else:
                        raise
            elif payload.media_url:
                data = self._publish_photo(payload, scheduled_unix=scheduled_unix)
            else:
                data = self._publish_feed(payload, scheduled_unix=scheduled_unix)
        except Exception as exc:  # noqa: BLE001
            logger.exception("facebook_publish_failed page_id=%s", self.page_id)
            return PublishResult(ok=False, platform="facebook", error=str(exc)[:800])

        post_id = str(data.get("id") or data.get("post_id") or "")
        if not post_id:
            return PublishResult(
                ok=False,
                platform="facebook",
                error=f"Facebook returned no post id: {data}",
                raw=data if isinstance(data, dict) else {},
            )
        return PublishResult(
            ok=True,
            platform="facebook",
            external_id=post_id,
            channel_id=self.page_id,
            channel_name=self.page_name,
            raw=data if isinstance(data, dict) else {},
        )

    def _is_video_permission_error(self, exc: Exception) -> bool:
        text = str(exc).lower()
        return (
            "no permission to publish the video" in text
            or "(#100)" in text and "video" in text and "permission" in text
        )

    def _parse_schedule_unix(self, iso: str | None) -> int | None:
        if not iso:
            return None
        try:
            raw = iso.replace("Z", "+00:00")
            dt = datetime.fromisoformat(raw)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=dt_timezone.utc)
            return int(dt.timestamp())
        except Exception:
            return None

    def _schedule_fields(self, scheduled_unix: int | None) -> dict[str, Any]:
        if scheduled_unix is None:
            return {"published": "true"}
        return {
            "published": "false",
            "scheduled_publish_time": str(scheduled_unix),
        }

    def _publish_photo(self, payload: PublishPayload, *, scheduled_unix: int | None) -> dict:
        fields = {
            "url": payload.media_url,
            "caption": payload.text or "",
            "access_token": self.access_token,
            **self._schedule_fields(scheduled_unix),
        }
        return self._post(f"/{self.page_id}/photos", fields)

    def _publish_video(self, payload: PublishPayload, *, scheduled_unix: int | None) -> dict:
        fields = {
            "file_url": payload.media_url,
            "description": payload.text or "",
            "access_token": self.access_token,
            **self._schedule_fields(scheduled_unix),
        }
        return self._post(f"/{self.page_id}/videos", fields)

    def _publish_feed(self, payload: PublishPayload, *, scheduled_unix: int | None) -> dict:
        fields = {
            "message": payload.text or "",
            "access_token": self.access_token,
            **self._schedule_fields(scheduled_unix),
        }
        return self._post(f"/{self.page_id}/feed", fields)

    def _post(self, path: str, fields: dict[str, Any]) -> dict[str, Any]:
        url = f"{GRAPH_BASE}{path}"
        body = urllib.parse.urlencode({k: v for k, v in fields.items() if v is not None}).encode(
            "utf-8"
        )
        request = urllib.request.Request(
            url,
            data=body,
            headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(raw)
                err = parsed.get("error") or {}
                msg = err.get("message") or raw
                code = err.get("code")
                sub = err.get("error_subcode")
                detail = f"{msg}"
                if code is not None:
                    detail = f"[{code}] {detail}"
                if sub is not None:
                    detail = f"{detail} (subcode {sub})"
                # 190 = OAuthException; 463/467 = expired/invalid session
                if code == 190 or sub in {463, 467}:
                    detail = (
                        "טוקן Facebook פג תוקף או לא תקף. "
                        "חדשו FACEBOOK_PAGE_ACCESS_TOKEN בשרת (Page token ארוך־טווח מ־Meta Graph API Explorer / App) "
                        f"ואז נסו שוב. ({detail})"
                    )
            except Exception:
                detail = raw or str(exc)
            raise RuntimeError(f"Facebook Graph API error: {detail}") from exc
