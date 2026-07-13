from __future__ import annotations

from django.utils import timezone

from whatsapp.application.config import WhatsAppConfig
from whatsapp.domain.enums import ConnectionState
from whatsapp.infrastructure.models import ConnectionStatus
from whatsapp.providers import get_whatsapp_provider
from whatsapp.providers.base import ProviderActionResult, ProviderHealth, ProviderQr, ProviderStatus


class ConnectionService:
    """Manages WhatsApp connection state and provider delegation."""

    def __init__(self, config: WhatsAppConfig | None = None) -> None:
        self._config = config or WhatsAppConfig.from_env()
        self._provider = get_whatsapp_provider(self._config)

    @property
    def provider(self):
        return self._provider

    def get_connection_record(self) -> ConnectionStatus:
        record = ConnectionStatus.objects.filter(deleted_at__isnull=True).order_by("created_at").first()
        if record:
            return record
        return ConnectionStatus.objects.create(
            provider=self._config.active_provider_type(),
            instance_name=self._config.evolution_instance,
        )

    def get_status(self, *, public: bool = False) -> dict:
        status = self._provider.get_status()
        record = self._sync_record(status)

        payload = status.to_dict()
        payload["connected"] = status.connection_status == ConnectionState.CONNECTED
        payload["last_sync_at"] = record.last_sync_at.isoformat() if record.last_sync_at else None

        if public:
            return {
                "connected": payload["connected"],
                "provider": payload["provider"],
                "message": payload["message"] or "WhatsApp is not connected yet.",
            }

        return payload

    def health_check(self) -> dict:
        health: ProviderHealth = self._provider.health_check()
        record = self.get_connection_record()
        record.health = health.status
        record.save(update_fields=["health", "updated_at"])
        return health.to_dict()

    def connect(self) -> dict:
        result: ProviderActionResult = self._provider.connect()
        self._apply_action_result(result)
        return result.to_dict()

    def disconnect(self) -> dict:
        result: ProviderActionResult = self._provider.disconnect()
        self._apply_action_result(result)
        return result.to_dict()

    def get_qr(self) -> dict:
        qr: ProviderQr = self._provider.get_qr()
        record = self.get_connection_record()
        if qr.qr_status:
            record.qr_status = qr.qr_status
            record.save(update_fields=["qr_status", "updated_at"])
        return qr.to_dict()

    def refresh(self) -> dict:
        return self.get_status(public=False)

    def _sync_record(self, status: ProviderStatus) -> ConnectionStatus:
        record = self.get_connection_record()
        record.provider = status.provider
        record.status = status.connection_status
        record.instance_name = status.instance or record.instance_name
        record.phone_number = status.phone_number or ""
        record.qr_status = status.qr_status
        record.health = status.health
        record.last_sync_at = timezone.now()
        record.last_error = "" if status.connection_status != ConnectionState.ERROR else status.message
        record.metadata = status.metadata
        record.save()
        return record

    def _apply_action_result(self, result: ProviderActionResult) -> ConnectionStatus:
        record = self.get_connection_record()
        record.status = result.connection_status
        if result.qr_status:
            record.qr_status = result.qr_status
        if result.phone_number:
            record.phone_number = result.phone_number
        if not result.ok:
            record.last_error = result.message
        record.last_sync_at = timezone.now()
        record.metadata = {**record.metadata, **result.metadata}
        record.save()
        return record
