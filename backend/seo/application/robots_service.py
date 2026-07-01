import os

from seo.application.settings_service import SEOSettingsService


class RobotsService:
    @staticmethod
    def detect_environment() -> str:
        env = os.environ.get("APP_ENV") or os.environ.get("RAILWAY_ENVIRONMENT") or ""
        env = env.lower()
        if env in ("production", "prod"):
            return "production"
        if env in ("staging", "stage"):
            return "staging"
        if os.environ.get("DEBUG", "false").lower() == "true":
            return "development"
        return "production"

    @classmethod
    def generate(cls, tenant_id, *, environment: str | None = None) -> str:
        env = environment or cls.detect_environment()
        settings = SEOSettingsService.get_settings(tenant_id)
        base = (settings.get("canonical_base_url") or "").rstrip("/")
        sitemap_url = f"{base}/sitemap.xml" if base else "/sitemap.xml"

        if env in ("development", "staging"):
            return "\n".join(
                [
                    "User-agent: *",
                    "Disallow: /",
                    "",
                    f"# environment: {env}",
                ]
            )

        policy = settings.get("robots_policy") or "index,follow"
        lines = ["User-agent: *"]

        if "noindex" in policy:
            lines.append("Disallow: /")
        else:
            lines.append("Allow: /")
            lines.append("Disallow: /dashboard/")
            lines.append("Disallow: /api/")

        lines.extend(["", f"Sitemap: {sitemap_url}"])
        return "\n".join(lines)
