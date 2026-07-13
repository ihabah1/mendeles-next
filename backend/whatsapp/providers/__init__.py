from __future__ import annotations

from whatsapp.application.config import WhatsAppConfig
from whatsapp.domain.enums import WhatsAppProviderType
from whatsapp.providers.base import WhatsAppProvider
from whatsapp.providers.evolution import EvolutionProvider

# Future: MetaCloudProvider, TwilioProvider


def get_whatsapp_provider(config: WhatsAppConfig | None = None) -> WhatsAppProvider:
    cfg = config or WhatsAppConfig.from_env()
    provider = cfg.active_provider_type()

    if provider == WhatsAppProviderType.EVOLUTION:
        return EvolutionProvider(cfg)

    # Default to Evolution scaffold until other providers are implemented.
    return EvolutionProvider(cfg)
