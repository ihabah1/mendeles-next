"""Evolution API provider — Phase 1 infrastructure only."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

from whatsapp.application.config import WhatsAppConfig
from whatsapp.domain.enums import ConnectionState, HealthStatus, QrStatus
from whatsapp.providers.base import (
    ProviderActionResult,
    ProviderHealth,
    ProviderQr,
    ProviderStatus,
    WhatsAppProvider,
)

logger = logging.getLogger(__name__)


class EvolutionProvider(WhatsAppProvider):
    """Evolution API implementation. Returns mock data when env is not configured."""

    def __init__(self, config: WhatsAppConfig | None = None) -> None:
        self._config = config or WhatsAppConfig.from_env()

    @property
    def name(self) -> str:
        return "evolution"

    def is_configured(self) -> bool:
        return self._config.is_evolution_configured()

    def get_status(self) -> ProviderStatus:
        if not self.is_configured():
            return self._mock_status()

        try:
            state = self._fetch_connection_state()
            phone = state.get("wid") or state.get("phone") or state.get("number")
            connected = str(state.get("state", "")).lower() in {"open", "connected"}
            return ProviderStatus(
                provider=self.name,
                configured=True,
                connection_status=ConnectionState.CONNECTED if connected else ConnectionState.CONNECTING,
                instance=self._config.evolution_instance,
                phone_number=str(phone) if phone else None,
                qr_status=QrStatus.SCANNED if connected else QrStatus.PENDING,
                health=HealthStatus.HEALTHY if connected else HealthStatus.DEGRADED,
                last_sync_at=None,
                message="Evolution API reachable.",
                metadata={"raw_state": state},
            )
        except Exception as exc:
            logger.exception("evolution_status_failed")
            return ProviderStatus(
                provider=self.name,
                configured=True,
                connection_status=ConnectionState.ERROR,
                instance=self._config.evolution_instance,
                phone_number=None,
                qr_status=QrStatus.UNAVAILABLE,
                health=HealthStatus.DOWN,
                last_sync_at=None,
                message=str(exc),
            )

    def health_check(self) -> ProviderHealth:
        if not self.is_configured():
            return ProviderHealth(
                status=HealthStatus.UNKNOWN,
                configured=False,
                reachable=False,
                message="Evolution API is not configured. Set EVOLUTION_API_URL, EVOLUTION_API_KEY, and EVOLUTION_INSTANCE.",
            )

        try:
            self._api_request("GET", f"/instance/connectionState/{self._config.evolution_instance}")
            return ProviderHealth(
                status=HealthStatus.HEALTHY,
                configured=True,
                reachable=True,
                message="Evolution API is reachable.",
            )
        except Exception as exc:
            logger.exception("evolution_health_failed")
            return ProviderHealth(
                status=HealthStatus.DOWN,
                configured=True,
                reachable=False,
                message=str(exc),
            )

    def connect(self) -> ProviderActionResult:
        if not self.is_configured():
            return ProviderActionResult(
                ok=False,
                connection_status=ConnectionState.NOT_CONNECTED,
                message="Evolution API is not configured.",
                qr_status=QrStatus.UNAVAILABLE,
            )

        try:
            data = self._api_request("GET", f"/instance/connect/{self._config.evolution_instance}")
            qr = data.get("base64") or data.get("qrcode") or data.get("code")
            return ProviderActionResult(
                ok=True,
                connection_status=ConnectionState.CONNECTING,
                message="Scan the QR code in the dashboard to connect WhatsApp.",
                qr_status=QrStatus.PENDING,
                metadata={"qr_available": bool(qr)},
            )
        except Exception as exc:
            logger.exception("evolution_connect_failed")
            return ProviderActionResult(
                ok=False,
                connection_status=ConnectionState.ERROR,
                message=str(exc),
                qr_status=QrStatus.UNAVAILABLE,
            )

    def disconnect(self) -> ProviderActionResult:
        if not self.is_configured():
            return ProviderActionResult(
                ok=False,
                connection_status=ConnectionState.NOT_CONNECTED,
                message="Evolution API is not configured.",
            )

        try:
            self._api_request("DELETE", f"/instance/logout/{self._config.evolution_instance}")
            return ProviderActionResult(
                ok=True,
                connection_status=ConnectionState.DISCONNECTED,
                message="WhatsApp instance disconnected.",
                qr_status=QrStatus.UNAVAILABLE,
            )
        except Exception as exc:
            logger.exception("evolution_disconnect_failed")
            return ProviderActionResult(
                ok=False,
                connection_status=ConnectionState.ERROR,
                message=str(exc),
            )

    def get_qr(self) -> ProviderQr:
        if not self.is_configured():
            return ProviderQr(
                qr_status=QrStatus.UNAVAILABLE,
                qr_code=None,
                message="Evolution API is not configured.",
            )

        try:
            data = self._api_request("GET", f"/instance/connect/{self._config.evolution_instance}")
            qr = data.get("base64") or data.get("qrcode") or data.get("code")
            if qr and not str(qr).startswith("data:"):
                qr = f"data:image/png;base64,{qr}"
            return ProviderQr(
                qr_status=QrStatus.PENDING if qr else QrStatus.UNAVAILABLE,
                qr_code=str(qr) if qr else None,
                message="Scan with WhatsApp mobile app." if qr else "QR code not available.",
            )
        except Exception as exc:
            logger.exception("evolution_qr_failed")
            return ProviderQr(
                qr_status=QrStatus.UNAVAILABLE,
                qr_code=None,
                message=str(exc),
            )

    def _mock_status(self) -> ProviderStatus:
        return ProviderStatus(
            provider=self.name,
            configured=False,
            connection_status=ConnectionState.NOT_CONNECTED,
            instance=self._config.evolution_instance or "",
            phone_number=None,
            qr_status=QrStatus.UNAVAILABLE,
            health=HealthStatus.UNKNOWN,
            last_sync_at=None,
            message="WhatsApp is not connected yet.",
        )

    def _fetch_connection_state(self) -> dict[str, Any]:
        data = self._api_request("GET", f"/instance/connectionState/{self._config.evolution_instance}")
        if isinstance(data, dict) and "instance" in data and isinstance(data["instance"], dict):
            return data["instance"]
        return data if isinstance(data, dict) else {}

    def _api_request(self, method: str, path: str) -> dict[str, Any]:
        url = f"{self._config.evolution_api_url.rstrip('/')}{path}"
        req = urllib.request.Request(
            url,
            method=method,
            headers={
                "apikey": self._config.evolution_api_key,
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Evolution API error {exc.code}: {body}") from exc
