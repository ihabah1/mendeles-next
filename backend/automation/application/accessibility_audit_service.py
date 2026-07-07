"""Site-wide accessibility audit — verifies widget, skip link, and main landmark on every page."""

from __future__ import annotations

import re
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass, field
from urllib.parse import urlparse

from django.conf import settings

from automation.application.log_service import AutomationLogService
from automation.infrastructure.models import AutomationExecution, AutomationJob
from seo.application.sitemap_service import LOCALES, SitemapService

# Paths not yet in sitemap static registry but required for full coverage.
EXTRA_PATHS = [
    "/accessibility",
    "/blog",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
]

# Dashboard and admin surfaces — same root layout includes the accessibility widget.
DASHBOARD_PATHS = [
    "/dashboard",
    "/dashboard/links",
    "/dashboard/users",
    "/dashboard/content",
    "/dashboard/studio/articles",
    "/dashboard/studio/landing-pages",
    "/dashboard/leads",
    "/dashboard/workspace",
    "/dashboard/traffic",
    "/dashboard/ai-seo",
    "/dashboard/automation",
    "/dashboard/seo",
    "/dashboard/roles",
    "/dashboard/settings",
    "/dashboard/settings/integrations/google",
    "/dashboard/audit",
]


@dataclass
class PageAuditResult:
    url: str
    path: str
    locale: str
    status_code: int | None
    ok: bool
    checks: dict[str, bool] = field(default_factory=dict)
    issues: list[str] = field(default_factory=list)
    error: str = ""


class AccessibilityAuditService:
    FETCH_TIMEOUT = 20
    USER_AGENT = "MendelesAccessibilityAudit/1.0"

    @classmethod
    def collect_paths(cls, tenant_id) -> list[dict]:
        seen: set[str] = set()
        paths: list[dict] = []

        def add(path: str, locale: str) -> None:
            localized = cls._localize_path(path, locale)
            if localized in seen:
                return
            seen.add(localized)
            paths.append({"path": localized, "locale": locale})

        for entry in SitemapService.collect_all(tenant_id):
            loc = entry.get("loc", "")
            parsed = urlparse(loc)
            add(parsed.path or "/", entry.get("locale", "he"))

        for path in EXTRA_PATHS + DASHBOARD_PATHS:
            for locale in LOCALES:
                add(path, locale)

        return sorted(paths, key=lambda item: (item["locale"], item["path"]))

    @classmethod
    def _localize_path(cls, path: str, locale: str) -> str:
        if locale == "he":
            return path if path.startswith("/") else f"/{path}"
        if path == "/":
            return "/en"
        return f"/en{path}"

    @classmethod
    def _absolute_url(cls, path: str) -> str:
        base = settings.FRONTEND_URL.rstrip("/")
        return f"{base}{path}"

    @classmethod
    def _fetch(cls, url: str) -> tuple[int | None, str, str]:
        request = urllib.request.Request(
            url,
            headers={"User-Agent": cls.USER_AGENT, "Accept": "text/html"},
            method="GET",
        )
        try:
            with urllib.request.urlopen(request, timeout=cls.FETCH_TIMEOUT) as response:
                body = response.read().decode("utf-8", errors="replace")
                return response.status, body, ""
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace") if exc.fp else ""
            return exc.code, body, str(exc)
        except urllib.error.URLError as exc:
            return None, "", str(exc.reason)

    @classmethod
    def _analyze_html(cls, html: str) -> tuple[dict[str, bool], list[str]]:
        checks = {
            "html_lang": bool(re.search(r"<html[^>]*\blang\s*=\s*['\"][a-z]{2}", html, re.I)),
            "main_landmark": 'id="main-content"' in html or "id='main-content'" in html,
            "skip_link": ('href="#main-content"' in html or "href='#main-content'" in html)
            and "skip-link" in html,
            "early_a11y_script": "mendeles-a11y" in html,
            "accessibility_widget": 'data-a11y-widget="toggle"' in html
            or ('aria-haspopup="dialog"' in html and "mendeles-a11y" in html),
        }
        issues = [name for name, passed in checks.items() if not passed]
        return checks, issues

    @classmethod
    def _audit_page(cls, path: str, locale: str) -> PageAuditResult:
        url = cls._absolute_url(path)
        status_code, html, fetch_error = cls._fetch(url)

        if fetch_error and not html:
            return PageAuditResult(
                url=url,
                path=path,
                locale=locale,
                status_code=status_code,
                ok=False,
                error=fetch_error,
                issues=["fetch_failed"],
            )

        if status_code is None or status_code >= 400:
            return PageAuditResult(
                url=url,
                path=path,
                locale=locale,
                status_code=status_code,
                ok=False,
                error=fetch_error or f"HTTP {status_code}",
                issues=["http_error"],
            )

        checks, issues = cls._analyze_html(html)
        return PageAuditResult(
            url=url,
            path=path,
            locale=locale,
            status_code=status_code,
            ok=not issues,
            checks=checks,
            issues=issues,
        )

    @classmethod
    def run(cls, job: AutomationJob, execution: AutomationExecution) -> dict:
        paths = cls.collect_paths(job.tenant_id)
        total = len(paths)
        results: list[PageAuditResult] = []

        AutomationLogService.log(
            job,
            f"Starting accessibility audit across {total} page(s)",
            execution=execution,
        )

        for index, item in enumerate(paths, start=1):
            result = cls._audit_page(item["path"], item["locale"])
            results.append(result)

            job.progress_percent = int((index / total) * 100) if total else 100
            job.save(update_fields=["progress_percent", "updated_at"])

            status = "OK" if result.ok else "FAIL"
            AutomationLogService.log(
                job,
                f"[{status}] {item['path']} ({item['locale']})"
                + (f" — {', '.join(result.issues)}" if result.issues else ""),
                execution=execution,
            )

        passed = sum(1 for r in results if r.ok)
        failed = total - passed
        report = {
            "audited_at": execution.started_at.isoformat() if execution.started_at else None,
            "total_pages": total,
            "passed_pages": passed,
            "failed_pages": failed,
            "all_passed": failed == 0,
            "pages": [asdict(r) for r in results],
        }

        job.config = {**(job.config or {}), "accessibility_audit": report}
        job.save(update_fields=["config", "updated_at"])

        summary = {
            "ok": failed == 0,
            "total_pages": total,
            "passed_pages": passed,
            "failed_pages": failed,
        }

        if failed:
            failing = [r.path for r in results if not r.ok][:5]
            raise RuntimeError(
                f"Accessibility audit failed on {failed}/{total} page(s). "
                f"Examples: {', '.join(failing)}"
            )

        AutomationLogService.log(
            job,
            f"Accessibility audit passed on all {total} page(s)",
            execution=execution,
        )
        return summary
