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
REQUIRED_PAGE_SCOPES = frozenset({"pages_manage_posts", "pages_read_engagement"})


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
        self._resolved_page_token: str | None = None

    def configured(self) -> bool:
        return bool(self.page_id and self.access_token)

    def page_token(self) -> str:
        """
        Return a token that can post as the Page.

        A User token cannot publish to /{page-id}/feed; Meta answers #200 even when
        the required scopes were granted. When the configured token belongs to a
        user, exchange it for the Page token via /{page-id}?fields=access_token.
        """
        if self._resolved_page_token:
            return self._resolved_page_token

        token = self.access_token
        try:
            identity = self._get("/me", {"fields": "id"}, token=token)
            identity_id = str(identity.get("id") or "")
        except Exception:
            identity_id = ""

        if identity_id and identity_id != self.page_id:
            try:
                page = self._get(f"/{self.page_id}", {"fields": "access_token"}, token=token)
                page_token = str(page.get("access_token") or "")
                if page_token:
                    logger.info("facebook_exchanged_user_token_for_page_token page_id=%s", self.page_id)
                    token = page_token
            except Exception:
                logger.warning("facebook_page_token_exchange_failed page_id=%s", self.page_id)

        self._resolved_page_token = token
        return token

    def verify_access(self) -> dict[str, Any]:
        """Validate page token and (optionally) required publish scopes."""
        if not self.configured():
            return {
                "ok": False,
                "can_publish": False,
                "missing_permissions": sorted(REQUIRED_PAGE_SCOPES),
                "error": "Facebook לא מוגדר (FACEBOOK_PAGE_ID / FACEBOOK_PAGE_ACCESS_TOKEN).",
            }
        try:
            page = self._get(f"/{self.page_id}", {"fields": "id,name"})
        except Exception as exc:  # noqa: BLE001
            return {
                "ok": False,
                "can_publish": False,
                "missing_permissions": sorted(REQUIRED_PAGE_SCOPES),
                "error": str(exc)[:800],
            }

        page_name = str(page.get("name") or self.page_name)
        token_kind = self._token_kind()
        scopes = self._token_scopes()
        if scopes is None:
            return {
                "ok": True,
                "can_publish": None,
                "page_id": str(page.get("id") or self.page_id),
                "page_name": page_name,
                "token_kind": token_kind,
                "missing_permissions": [],
                "error": "",
            }

        missing = sorted(REQUIRED_PAGE_SCOPES - scopes)
        can_publish = not missing
        error = ""
        if missing:
            error = (
                "לטוקן Facebook חסרות הרשאות: "
                + ", ".join(missing)
                + ". הפיקו Page Access Token חדש ב-Graph API Explorer עם pages_manage_posts "
                "ו-pages_read_engagement, וודאו שהמשתמש Admin בדף."
            )
        return {
            "ok": True,
            "can_publish": can_publish,
            "page_id": str(page.get("id") or self.page_id),
            "page_name": page_name,
            "token_kind": token_kind,
            "missing_permissions": missing,
            "scopes": sorted(scopes),
            "error": error,
        }

    def _token_kind(self) -> str:
        try:
            identity = self._get("/me", {"fields": "id"})
        except Exception:
            return "unknown"
        identity_id = str(identity.get("id") or "")
        if not identity_id:
            return "unknown"
        return "page" if identity_id == self.page_id else "user"

    def _token_scopes(self) -> set[str] | None:
        app_id = (os.environ.get("FACEBOOK_APP_ID") or "").strip()
        app_secret = (os.environ.get("FACEBOOK_APP_SECRET") or "").strip()
        if not app_id or not app_secret:
            return None
        try:
            debug = self._get(
                "/debug_token",
                {
                    "input_token": self.access_token,
                    "access_token": f"{app_id}|{app_secret}",
                },
            )
        except Exception:
            return None
        data = debug.get("data") if isinstance(debug, dict) else {}
        if not isinstance(data, dict) or not data.get("is_valid"):
            return set()
        scopes = set(data.get("scopes") or [])
        for item in data.get("granular_scopes") or []:
            if isinstance(item, dict) and item.get("scope"):
                scopes.add(str(item["scope"]))
        return scopes

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
            "access_token": self.page_token(),
            **self._schedule_fields(scheduled_unix),
        }
        return self._post(f"/{self.page_id}/photos", fields)

    def _publish_video(self, payload: PublishPayload, *, scheduled_unix: int | None) -> dict:
        fields = {
            "file_url": payload.media_url,
            "description": payload.text or "",
            "access_token": self.page_token(),
            **self._schedule_fields(scheduled_unix),
        }
        return self._post(f"/{self.page_id}/videos", fields)

    def _publish_feed(self, payload: PublishPayload, *, scheduled_unix: int | None) -> dict:
        fields = {
            "message": payload.text or "",
            "access_token": self.page_token(),
            **self._schedule_fields(scheduled_unix),
        }
        return self._post(f"/{self.page_id}/feed", fields)

    def _get(
        self,
        path: str,
        params: dict[str, Any] | None = None,
        *,
        token: str | None = None,
    ) -> dict[str, Any]:
        query = dict(params or {})
        query.setdefault("access_token", token or self.access_token)
        url = f"{GRAPH_BASE}{path}?{urllib.parse.urlencode(query)}"
        request = urllib.request.Request(url, headers={"Accept": "application/json"}, method="GET")
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raise RuntimeError(self._format_graph_error(exc)) from exc

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
            raise RuntimeError(self._format_graph_error(exc)) from exc

    def _format_graph_error(self, exc: urllib.error.HTTPError) -> str:
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
            elif code == 200 or (
                "pages_manage_posts" in msg.lower() or "pages_read_engagement" in msg.lower()
            ):
                detail = (
                    "לטוקן Facebook חסרות הרשאות פרסום לדף. "
                    "הפיקו Page Access Token חדש עם pages_manage_posts ו-pages_read_engagement "
                    "(וגם pages_show_list), וודאו שהמשתמש הוא Admin בדף. "
                    f"({detail})"
                )
        except Exception:
            detail = raw or str(exc)
        return f"Facebook Graph API error: {detail}"
