"""Buffer GraphQL publisher — auto-discovers channels from BUFFER_ACCESS_TOKEN only."""

from __future__ import annotations

import json
import logging
import os
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone as dt_timezone
from typing import Any

from social.providers.base import (
    PLATFORM_SERVICE_MAP,
    PublishPayload,
    PublishResult,
    SocialPublisher,
)

logger = logging.getLogger(__name__)

RATE_LIMIT_USER_MESSAGE = (
    "Buffer חסם את ה-API ל-24 שעות (RATE_LIMIT_EXCEEDED). "
    "זה מגבלת Buffer על מפתח הגישה — לא באג במנדלס. "
    "המתינו לסיום חלון ה-24 שעות, הימנעו מלחיצות שליחה חוזרות, "
    "ובדקו את מגבלות התוכנית ב-Buffer."
)


class BufferError(RuntimeError):
    def __init__(self, message: str, *, rate_limited: bool = False):
        super().__init__(message)
        self.rate_limited = rate_limited


def _looks_like_rate_limit(text: str) -> bool:
    t = (text or "").lower()
    return (
        "rate_limit" in t
        or "rate limit" in t
        or "too many requests" in t
        or '"code":"rate_limit_exceeded"' in t
        or "429" in t
    )


class BufferPublisher(SocialPublisher):
    """
    Official Buffer GraphQL API client (https://api.buffer.com).

    Only BUFFER_ACCESS_TOKEN is required. Channel IDs are discovered at runtime
    and cached in memory — no BUFFER_PROFILE_* env vars.
    """

    GRAPHQL_URL = "https://api.buffer.com"
    # Long TTL cuts discovery GraphQL traffic (orgs + channels) which burns quota fast.
    CACHE_TTL_SECONDS = 6 * 3600
    STALE_CACHE_MAX_SECONDS = 48 * 3600

    _cache_lock = threading.Lock()
    _channels_cache: list[dict[str, Any]] | None = None
    _cache_loaded_at: float = 0.0
    _organization_ids_cache: list[str] | None = None
    _rate_limited_until: float = 0.0

    def __init__(self, access_token: str | None = None):
        self.access_token = (
            access_token
            or os.environ.get("BUFFER_ACCESS_TOKEN")
            or ""
        ).strip()

    def configured(self) -> bool:
        return bool(self.access_token)

    @classmethod
    def mark_rate_limited(cls, *, hours: float = 24.0) -> None:
        with cls._cache_lock:
            cls._rate_limited_until = max(cls._rate_limited_until, time.time() + hours * 3600)

    @classmethod
    def is_rate_limited(cls) -> bool:
        with cls._cache_lock:
            return time.time() < cls._rate_limited_until

    @classmethod
    def rate_limit_message(cls) -> str:
        return RATE_LIMIT_USER_MESSAGE

    # ------------------------------------------------------------------ GraphQL

    def _raise_rate_limit(self, detail: str) -> None:
        self.mark_rate_limited(hours=24)
        raise BufferError(RATE_LIMIT_USER_MESSAGE, rate_limited=True)

    def _graphql(self, query: str, variables: dict[str, Any] | None = None) -> dict[str, Any]:
        if not self.access_token:
            raise BufferError("BUFFER_ACCESS_TOKEN is not configured.")
        if self.is_rate_limited():
            raise BufferError(RATE_LIMIT_USER_MESSAGE, rate_limited=True)

        payload = {"query": query}
        if variables is not None:
            payload["variables"] = variables

        request = urllib.request.Request(
            self.GRAPHQL_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {self.access_token}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                body = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            if exc.code == 429 or _looks_like_rate_limit(detail):
                self._raise_rate_limit(detail)
            raise BufferError(f"Buffer GraphQL HTTP {exc.code}: {detail[:500]}") from exc
        except BufferError:
            raise
        except Exception as exc:
            raise BufferError(f"Buffer GraphQL request failed: {exc}") from exc

        if body.get("errors"):
            messages = "; ".join(
                str(err.get("message") or err) for err in body["errors"][:5]
            )
            raw = json.dumps(body.get("errors")[:3], ensure_ascii=False)
            if _looks_like_rate_limit(messages) or _looks_like_rate_limit(raw):
                self._raise_rate_limit(raw)
            raise BufferError(f"Buffer GraphQL error: {messages}")
        return body.get("data") or {}

    # -------------------------------------------------------------- Discovery

    def _fetch_organization_ids(self) -> list[str]:
        data = self._graphql(
            """
            query GetOrganizations {
              account {
                organizations {
                  id
                  name
                }
              }
            }
            """
        )
        orgs = ((data.get("account") or {}).get("organizations")) or []
        ids = [str(o["id"]) for o in orgs if o.get("id")]
        if not ids:
            raise BufferError("No Buffer organizations found for this API key.")
        return ids

    def _fetch_channels_for_org(self, organization_id: str) -> list[dict[str, Any]]:
        data = self._graphql(
            """
            query GetChannels($organizationId: OrganizationId!) {
              channels(input: { organizationId: $organizationId }) {
                id
                name
                displayName
                descriptor
                service
                type
                avatar
                isDisconnected
                isLocked
                isQueuePaused
                organizationId
                timezone
              }
            }
            """,
            {"organizationId": organization_id},
        )
        channels = data.get("channels") or []
        return [c for c in channels if isinstance(c, dict) and c.get("id")]

    def refresh_channels(self) -> list[dict[str, Any]]:
        """Authenticate, load all connected channels, replace in-memory cache."""
        org_ids = self._fetch_organization_ids()
        all_channels: list[dict[str, Any]] = []
        for org_id in org_ids:
            all_channels.extend(self._fetch_channels_for_org(org_id))

        normalized = [self._normalize_channel(ch) for ch in all_channels]
        with self._cache_lock:
            self.__class__._organization_ids_cache = org_ids
            self.__class__._channels_cache = normalized
            self.__class__._cache_loaded_at = time.time()
        logger.info("Buffer channels refreshed: %s channel(s) across %s org(s)", len(normalized), len(org_ids))
        return normalized

    @staticmethod
    def _normalize_channel(raw: dict[str, Any]) -> dict[str, Any]:
        service = str(raw.get("service") or "").strip().lower()
        name = str(raw.get("name") or "").strip()
        display = str(raw.get("displayName") or "").strip()
        descriptor = str(raw.get("descriptor") or "").strip()
        return {
            "id": str(raw.get("id") or ""),
            "name": name,
            "display_name": display,
            "descriptor": descriptor,
            "service": service,
            "type": str(raw.get("type") or "").strip().lower(),
            "avatar": raw.get("avatar") or "",
            "is_disconnected": bool(raw.get("isDisconnected")),
            "is_locked": bool(raw.get("isLocked")),
            "is_queue_paused": bool(raw.get("isQueuePaused")),
            "organization_id": str(raw.get("organizationId") or ""),
            "timezone": raw.get("timezone") or "",
            "label": display or name or descriptor or service,
            # Status-view compatibility keys
            "formatted_username": display or name,
        }

    def list_channels(self, *, force_refresh: bool = False) -> list[dict[str, Any]]:
        with self._cache_lock:
            cached = self.__class__._channels_cache
            loaded_at = self.__class__._cache_loaded_at
            age = time.time() - loaded_at if loaded_at else 1e9
            fresh = cached is not None and age < self.CACHE_TTL_SECONDS
            stale_ok = cached is not None and age < self.STALE_CACHE_MAX_SECONDS

        if self.is_rate_limited():
            if stale_ok:
                logger.warning("Buffer rate-limited — serving stale channel cache")
                return list(cached or [])
            raise BufferError(RATE_LIMIT_USER_MESSAGE, rate_limited=True)

        if force_refresh or not fresh:
            try:
                return self.refresh_channels()
            except BufferError as exc:
                if getattr(exc, "rate_limited", False) and stale_ok:
                    logger.warning("Buffer refresh rate-limited — serving stale channel cache")
                    return list(cached or [])
                raise
        return list(cached or [])

    def list_profiles(self) -> list[dict[str, Any]]:
        return self.list_channels()

    def connected_platform_summary(self, channels: list[dict[str, Any]] | None = None) -> str:
        channels = channels if channels is not None else self.list_channels()
        usable = [c for c in channels if not c.get("is_disconnected") and not c.get("is_locked")]
        if not usable:
            return "(none)"
        parts = []
        for ch in usable:
            parts.append(f"{ch.get('service')} ({ch.get('label')})")
        return ", ".join(parts)

    # -------------------------------------------------------------- Resolve

    @staticmethod
    def _services_for_platform(platform: str) -> set[str]:
        key = (platform or "").strip().lower()
        aliases = PLATFORM_SERVICE_MAP.get(key)
        if aliases:
            return {a.lower() for a in aliases}
        return {key} if key else set()

    def resolve_channel(
        self,
        platform: str,
        *,
        channel_name: str | None = None,
        channels: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any] | None:
        channels = channels if channels is not None else self.list_channels()
        services = self._services_for_platform(platform)
        candidates = [
            ch
            for ch in channels
            if ch.get("service") in services
            and not ch.get("is_disconnected")
            and not ch.get("is_locked")
        ]
        if not candidates:
            return None

        preferred = (channel_name or "").strip().lower()
        if preferred:
            exact = [
                ch
                for ch in candidates
                if preferred
                in {
                    str(ch.get("name") or "").lower(),
                    str(ch.get("display_name") or "").lower(),
                    str(ch.get("label") or "").lower(),
                    str(ch.get("descriptor") or "").lower(),
                }
                or preferred in str(ch.get("name") or "").lower()
                or preferred in str(ch.get("display_name") or "").lower()
                or preferred in str(ch.get("label") or "").lower()
            ]
            if exact:
                return exact[0]
            return None

        # Multiple channels of the same platform: prefer Profile/Page order, else first.
        type_rank = {"profile": 0, "page": 1, "business": 2, "account": 3}
        candidates.sort(key=lambda c: type_rank.get(str(c.get("type") or ""), 99))
        return candidates[0]

    # -------------------------------------------------------------- Publish

    def publish(self, payload: PublishPayload) -> PublishResult:
        try:
            if self.is_rate_limited():
                return PublishResult(
                    ok=False,
                    platform=payload.platform,
                    error=RATE_LIMIT_USER_MESSAGE,
                )

            channels = self.list_channels()
            channel = self.resolve_channel(
                payload.platform,
                channel_name=payload.channel_name,
                channels=channels,
            )
            if not channel:
                connected = self.connected_platform_summary(channels)
                if payload.channel_name:
                    error = (
                        f"No Buffer channel matched platform '{payload.platform}' "
                        f"with name '{payload.channel_name}'. Connected channels: {connected}."
                    )
                else:
                    error = (
                        f"Platform '{payload.platform}' is not connected in Buffer. "
                        f"Connected channels: {connected}."
                    )
                return PublishResult(ok=False, platform=payload.platform, error=error)

            if payload.now or not payload.scheduled_at_iso:
                mode = "shareNow"
                due_at = None
            else:
                mode = "customScheduled"
                due_at = payload.scheduled_at_iso

            assets: list[dict[str, Any]] = []
            media_url = (payload.media_url or "").strip()
            if media_url:
                if (payload.media_kind or "image").lower() == "video":
                    assets.append({"video": {"url": media_url}})
                else:
                    assets.append({"image": {"url": media_url}})

            variables: dict[str, Any] = {
                "input": {
                    "text": payload.text,
                    "channelId": channel["id"],
                    "schedulingType": "automatic",
                    "mode": mode,
                    "assets": assets,
                }
            }
            if due_at:
                variables["input"]["dueAt"] = due_at

            # Instagram requires an explicit post type (post / story / reel).
            platform_key = (payload.platform or "").strip().lower()
            if platform_key == "instagram":
                ig_type = (payload.instagram_type or "post").strip().lower()
                if ig_type not in {"post", "story", "reel"}:
                    ig_type = "post"
                variables["input"]["metadata"] = {
                    "instagram": {
                        "type": ig_type,
                        "shouldShareToFeed": True,
                    }
                }

            logger.info(
                "buffer_create_post platform=%s channel=%s mode=%s assets=%s metadata=%s",
                payload.platform,
                channel.get("id"),
                mode,
                assets,
                variables["input"].get("metadata"),
            )

            data = self._graphql(
                """
                mutation CreatePost($input: CreatePostInput!) {
                  createPost(input: $input) {
                    ... on PostActionSuccess {
                      post {
                        id
                        text
                        status
                      }
                    }
                    ... on MutationError {
                      message
                    }
                  }
                }
                """,
                variables,
            )
            result = data.get("createPost") or {}
            if result.get("message") and not result.get("post"):
                msg = str(result["message"])
                if _looks_like_rate_limit(msg):
                    self.mark_rate_limited(hours=24)
                    msg = RATE_LIMIT_USER_MESSAGE
                return PublishResult(
                    ok=False,
                    platform=payload.platform,
                    error=msg,
                    channel_id=channel["id"],
                    channel_name=channel.get("label") or "",
                    raw=result,
                )

            post = result.get("post") or {}
            return PublishResult(
                ok=True,
                platform=payload.platform,
                external_id=str(post.get("id") or ""),
                channel_id=channel["id"],
                channel_name=channel.get("label") or "",
                raw=result,
            )
        except BufferError as exc:
            if getattr(exc, "rate_limited", False) or _looks_like_rate_limit(str(exc)):
                self.mark_rate_limited(hours=24)
                return PublishResult(
                    ok=False,
                    platform=payload.platform,
                    error=RATE_LIMIT_USER_MESSAGE,
                )
            return PublishResult(ok=False, platform=payload.platform, error=str(exc))

    @classmethod
    def clear_cache(cls) -> None:
        with cls._cache_lock:
            cls._channels_cache = None
            cls._organization_ids_cache = None
            cls._cache_loaded_at = 0.0
            cls._rate_limited_until = 0.0


def warm_buffer_channel_cache() -> None:
    """
    Best-effort channel discovery — disabled by default to avoid burning Buffer quota
    on every Gunicorn worker boot. Channels load lazily on first publish/status call.
    Set BUFFER_WARM_CHANNELS_ON_BOOT=1 to re-enable.
    """
    if (os.environ.get("BUFFER_WARM_CHANNELS_ON_BOOT") or "").strip() not in {"1", "true", "yes"}:
        return
    token = (os.environ.get("BUFFER_ACCESS_TOKEN") or "").strip()
    if not token:
        return
    try:
        BufferPublisher(access_token=token).refresh_channels()
    except Exception as exc:
        logger.warning("Buffer channel cache warm-up skipped: %s", exc)


def due_at_iso_from_unix(ts: int | None) -> str | None:
    if not ts:
        return None
    return datetime.fromtimestamp(int(ts), tz=dt_timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
