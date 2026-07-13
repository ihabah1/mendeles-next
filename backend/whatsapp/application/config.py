from __future__ import annotations

import os
from dataclasses import dataclass

from whatsapp.domain.enums import WhatsAppProviderType


@dataclass(frozen=True)
class WhatsAppConfig:
    provider: str
    evolution_api_url: str
    evolution_api_key: str
    evolution_instance: str

    @classmethod
    def from_env(cls) -> WhatsAppConfig:
        return cls(
            provider=os.environ.get("WHATSAPP_PROVIDER", "evolution").strip().lower(),
            evolution_api_url=os.environ.get("EVOLUTION_API_URL", "").strip(),
            evolution_api_key=os.environ.get("EVOLUTION_API_KEY", "").strip(),
            evolution_instance=os.environ.get("EVOLUTION_INSTANCE", "").strip(),
        )

    def is_evolution_configured(self) -> bool:
        return bool(self.evolution_api_url and self.evolution_api_key and self.evolution_instance)

    def active_provider_type(self) -> str:
        if self.provider == WhatsAppProviderType.EVOLUTION:
            return WhatsAppProviderType.EVOLUTION
        return self.provider
