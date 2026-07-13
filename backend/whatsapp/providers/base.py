from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ProviderStatus:
    provider: str
    configured: bool
    connection_status: str
    instance: str
    phone_number: str | None
    qr_status: str
    health: str
    last_sync_at: str | None
    message: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "configured": self.configured,
            "connection_status": self.connection_status,
            "instance": self.instance,
            "phone_number": self.phone_number,
            "qr_status": self.qr_status,
            "health": self.health,
            "last_sync_at": self.last_sync_at,
            "message": self.message,
            "metadata": self.metadata,
        }


@dataclass
class ProviderHealth:
    status: str
    configured: bool
    reachable: bool
    message: str = ""
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "configured": self.configured,
            "reachable": self.reachable,
            "message": self.message,
            "details": self.details,
        }


@dataclass
class ProviderQr:
    qr_status: str
    qr_code: str | None = None
    expires_at: str | None = None
    message: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "qr_status": self.qr_status,
            "qr_code": self.qr_code,
            "expires_at": self.expires_at,
            "message": self.message,
        }


@dataclass
class ProviderActionResult:
    ok: bool
    connection_status: str
    message: str = ""
    qr_status: str | None = None
    phone_number: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "connection_status": self.connection_status,
            "message": self.message,
            "qr_status": self.qr_status,
            "phone_number": self.phone_number,
            "metadata": self.metadata,
        }


class WhatsAppProvider(ABC):
    """Provider interface for WhatsApp integrations."""

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        pass

    @abstractmethod
    def get_status(self) -> ProviderStatus:
        pass

    @abstractmethod
    def health_check(self) -> ProviderHealth:
        pass

    @abstractmethod
    def connect(self) -> ProviderActionResult:
        pass

    @abstractmethod
    def disconnect(self) -> ProviderActionResult:
        pass

    @abstractmethod
    def get_qr(self) -> ProviderQr:
        pass
