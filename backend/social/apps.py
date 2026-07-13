from django.apps import AppConfig


class SocialConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "social"
    verbose_name = "Social AI Automation"

    def ready(self) -> None:
        # Discover Buffer channels once on startup when token is present.
        try:
            from social.providers.buffer import warm_buffer_channel_cache

            warm_buffer_channel_cache()
        except Exception:
            # Never block app boot on Buffer availability.
            pass
