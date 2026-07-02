import pytest

from automation.domain.enums import JobStatus, JobType
from automation.management.commands.seed_automation import Command as SeedAutomation


@pytest.fixture
def automation_seeded(tenant):
    SeedAutomation().handle()
    return tenant


@pytest.mark.django_db
def test_create_and_list_jobs(owner_client, automation_seeded):
    create = owner_client.post(
        "/api/v1/automation/",
        {"name": "Health Job", "job_type": JobType.HEALTH_CHECK},
        format="json",
    )
    assert create.status_code == 201
    assert create.json()["status"] == JobStatus.QUEUED

    listing = owner_client.get("/api/v1/automation/")
    assert listing.status_code == 200
    assert listing.json()["count"] >= 1


@pytest.mark.django_db
def test_dashboard_stats_empty(owner_client, automation_seeded):
    response = owner_client.get("/api/v1/automation/dashboard/")
    assert response.status_code == 200
    stats = response.json()["stats"]
    assert stats["total_jobs"] == 0
    assert stats["queue_size"] == 0
    assert stats["running_jobs"] == 0


@pytest.mark.django_db
def test_process_health_check_job(owner_client, automation_seeded, tenant):
    from django.core.management import call_command

    create = owner_client.post(
        "/api/v1/automation/",
        {"name": "Run health", "job_type": JobType.HEALTH_CHECK},
        format="json",
    )
    job_id = create.json()["id"]
    call_command("process_automation_queue", limit=1)

    detail = owner_client.get(f"/api/v1/automation/{job_id}/")
    assert detail.status_code == 200
    assert detail.json()["status"] == JobStatus.COMPLETED


@pytest.mark.django_db
def test_unimplemented_job_type_fails_honestly(owner_client, automation_seeded):
    from django.core.management import call_command

    create = owner_client.post(
        "/api/v1/automation/",
        {"name": "Blog gen", "job_type": JobType.GENERATE_BLOG_ARTICLE},
        format="json",
    )
    job_id = create.json()["id"]
    call_command("process_automation_queue", limit=1)

    detail = owner_client.get(f"/api/v1/automation/{job_id}/")
    assert detail.json()["status"] == JobStatus.FAILED
    assert "not implemented" in detail.json()["error_message"].lower()


@pytest.mark.django_db
def test_pause_resume_cancel(owner_client, automation_seeded):
    create = owner_client.post(
        "/api/v1/automation/",
        {"name": "Pausable", "job_type": JobType.HEALTH_CHECK},
        format="json",
    )
    job_id = create.json()["id"]

    pause = owner_client.post(f"/api/v1/automation/{job_id}/pause/")
    assert pause.status_code == 200
    assert pause.json()["status"] == JobStatus.PAUSED

    resume = owner_client.post(f"/api/v1/automation/{job_id}/resume/")
    assert resume.status_code == 200
    assert resume.json()["status"] == JobStatus.QUEUED

    cancel = owner_client.post(f"/api/v1/automation/{job_id}/cancel/")
    assert cancel.status_code == 200
    assert cancel.json()["status"] == JobStatus.CANCELLED


@pytest.mark.django_db
def test_readonly_cannot_create_jobs(readonly_client, automation_seeded):
    response = readonly_client.post(
        "/api/v1/automation/",
        {"name": "Nope", "job_type": JobType.HEALTH_CHECK},
        format="json",
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_dashboard_service_counts(tenant, automation_seeded, owner_user):
    from automation.application.dashboard_service import DashboardService
    from automation.application.job_service import JobService

    JobService.create_job(
        tenant.id,
        owner_user,
        {"name": "A", "job_type": JobType.HEALTH_CHECK},
    )
    stats = DashboardService.stats_for_tenant(tenant.id)
    assert stats["total_jobs"] == 1
    assert stats["queue_size"] == 1
