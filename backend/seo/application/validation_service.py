from seo.application.metadata_service import MetadataService
from seo.application.schema_service import SchemaService
from seo.application.settings_service import SEOSettingsService
from seo.application.slug_service import SlugService


class SEOValidationService:
    """Structured SEO validation report for pages and global settings."""

    @classmethod
    def validate_page(cls, tenant_id, page: dict) -> dict:
        metadata = MetadataService.build(tenant_id, page=page)
        issues: list[dict] = []

        if not metadata.get("title"):
            issues.append({"code": "missing_title", "severity": "error", "message": "Missing page title"})
        if not metadata.get("description"):
            issues.append({"code": "missing_description", "severity": "error", "message": "Missing meta description"})
        if not metadata.get("canonical"):
            issues.append({"code": "missing_canonical", "severity": "warning", "message": "Missing canonical URL"})
        if not metadata.get("open_graph", {}).get("image"):
            issues.append({"code": "missing_open_graph", "severity": "warning", "message": "Missing Open Graph image"})

        slug = page.get("slug")
        if slug:
            dup = SlugService.find_duplicate(tenant_id, slug, page.get("locale", "he"))
            if dup and str(dup.content_id) != str(page.get("content_id") or ""):
                issues.append(
                    {
                        "code": "duplicate_slug",
                        "severity": "error",
                        "message": f"Slug '{slug}' is already in use",
                    }
                )

        breadcrumbs = page.get("breadcrumbs")
        has_schema = bool(breadcrumbs)
        if breadcrumbs:
            try:
                SchemaService.breadcrumb(tenant_id, breadcrumbs)
            except Exception:
                has_schema = False

        if not has_schema and page.get("require_schema"):
            issues.append({"code": "missing_schema", "severity": "warning", "message": "Missing breadcrumb schema"})

        score = max(0, 100 - (len([i for i in issues if i["severity"] == "error"]) * 25) - (len([i for i in issues if i["severity"] == "warning"]) * 10))

        return {
            "valid": not any(i["severity"] == "error" for i in issues),
            "score": score,
            "issues": issues,
            "metadata": metadata,
        }

    @classmethod
    def validate_global(cls, tenant_id) -> dict:
        settings = SEOSettingsService.get_settings(tenant_id)
        issues: list[dict] = []

        if not settings.get("site_name"):
            issues.append({"code": "missing_site_name", "severity": "error", "message": "Missing site name"})
        if not settings.get("default_title"):
            issues.append({"code": "missing_default_title", "severity": "warning", "message": "Missing default title"})
        if not settings.get("default_description"):
            issues.append({"code": "missing_default_description", "severity": "warning", "message": "Missing default description"})
        if not settings.get("canonical_base_url"):
            issues.append({"code": "missing_canonical_base", "severity": "error", "message": "Missing canonical base URL"})
        if not settings.get("organization_name"):
            issues.append({"code": "missing_organization", "severity": "warning", "message": "Missing organization name"})

        score = max(0, 100 - (len([i for i in issues if i["severity"] == "error"]) * 25) - (len([i for i in issues if i["severity"] == "warning"]) * 10))

        return {
            "valid": not any(i["severity"] == "error" for i in issues),
            "score": score,
            "issues": issues,
            "settings": settings,
        }

    @classmethod
    def status(cls, tenant_id) -> dict:
        global_report = cls.validate_global(tenant_id)
        sample_page = cls.validate_page(
            tenant_id,
            {"path": "/", "title": "", "description": ""},
        )
        return {
            "global": global_report,
            "homepage": sample_page,
            "overall_score": round((global_report["score"] + sample_page["score"]) / 2),
            "ready_for_production": global_report["valid"] and global_report["score"] >= 70,
        }
