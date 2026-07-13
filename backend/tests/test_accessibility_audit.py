import pytest
from unittest.mock import patch

from automation.domain.enums import JobStatus, JobType
from automation.management.commands.seed_automation import Command as SeedAutomation


GOOD_HTML = """
<!DOCTYPE html>
<html lang="he">
<head><script>mendeles-a11y</script></head>
<body>
<a href="#main-content" class="skip-link">Skip</a>
<main id="main-content" tabindex="-1">Content</main>
<button data-a11y-widget="toggle" aria-haspopup="dialog">A11y</button>
</body>
</html>
"""

BAD_HTML = """
<!DOCTYPE html>
<html>
<body><div>No accessibility</div></body>
</html>
"""


@pytest.fixture
def automation_seeded(tenant):
    SeedAutomation().handle()
    return tenant


@pytest.mark.django_db
def test_accessibility_audit_job_passes(owner_client, automation_seeded, tenant, settings):
    from django.core.management import call_command

    settings.FRONTEND_URL = "http://frontend.test"

    def fake_fetch(url):
        return 200, GOOD_HTML, ""

    with patch(
        "automation.application.accessibility_audit_service.AccessibilityAuditService._fetch",
        side_effect=fake_fetch,
    ):
        create = owner_client.post(
            "/api/v1/automation/",
            {
                "name": "A11y audit",
                "job_type": JobType.ACCESSIBILITY_AUDIT,
            },
            format="json",
        )
        assert create.status_code == 201
        job_id = create.json()["id"]
        call_command("process_automation_queue", limit=1)

        detail = owner_client.get(f"/api/v1/automation/{job_id}/")
        data = detail.json()
        assert data["status"] == JobStatus.COMPLETED
        report = data["config"]["accessibility_audit"]
        assert report["all_passed"] is True
        assert report["failed_pages"] == 0
        assert report["total_pages"] > 0


@pytest.mark.django_db
def test_accessibility_audit_job_fails_on_missing_widget(owner_client, automation_seeded, tenant, settings):
    from django.core.management import call_command

    settings.FRONTEND_URL = "http://frontend.test"

    def fake_fetch(url):
        return 200, BAD_HTML, ""

    with patch(
        "automation.application.accessibility_audit_service.AccessibilityAuditService._fetch",
        side_effect=fake_fetch,
    ):
        create = owner_client.post(
            "/api/v1/automation/",
            {
                "name": "A11y audit fail",
                "job_type": JobType.ACCESSIBILITY_AUDIT,
            },
            format="json",
        )
        job_id = create.json()["id"]
        call_command("process_automation_queue", limit=1)

        detail = owner_client.get(f"/api/v1/automation/{job_id}/")
        data = detail.json()
        assert data["status"] == JobStatus.FAILED
        assert "accessibility audit failed" in data["error_message"].lower()
        report = data["config"]["accessibility_audit"]
        assert report["failed_pages"] > 0


@pytest.mark.django_db
def test_accessibility_audit_collects_he_and_en_paths(tenant):
    from automation.application.accessibility_audit_service import AccessibilityAuditService

    paths = AccessibilityAuditService.collect_paths(tenant.id)
    locales = {item["locale"] for item in paths}
    localized = {item["path"] for item in paths}

    assert locales == {"he", "en", "ar"}
    assert "/accessibility" in localized
    assert "/en/accessibility" in localized
    assert "/dashboard/automation" in localized
    assert "/en/dashboard/automation" in localized
