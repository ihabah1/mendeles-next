import pytest

from automation.application.executor import JobExecutor
from automation.application.site_translation_service import SiteTranslationService
from automation.domain.enums import JobStatus, JobType
from automation.management.commands.seed_automation import Command as SeedAutomation
from content.domain.status import PageStatus, PageType
from content.infrastructure.models import Page


@pytest.fixture
def automation_seeded(tenant):
    SeedAutomation().handle()
    return tenant


@pytest.mark.django_db
def test_site_translation_preview_and_create(owner_client, automation_seeded, tenant, owner_user):
    Page.objects.create(
        tenant=tenant,
        title="דף בית",
        slug="home",
        full_path="/",
        locale="he",
        page_type=PageType.LANDING_PAGE,
        status=PageStatus.PUBLISHED,
        created_by=owner_user,
    )
    preview = owner_client.get("/api/v1/automation/site-translations/preview/?locale=en&locale=es")
    assert preview.status_code == 200
    body = preview.json()
    assert body["source_pages"] >= 1
    assert body["planned_units"] >= 2

    create = owner_client.post(
        "/api/v1/automation/site-translations/",
        {"target_locales": ["en", "es"], "skip_existing": True},
        format="json",
    )
    assert create.status_code == 201, create.content
    job = create.json()
    assert job["job_type"] == JobType.TRANSLATE_SITE_PAGES
    assert job["total_tasks"] >= 2
    assert job["status"] == JobStatus.QUEUED


@pytest.mark.django_db
def test_site_translation_run_next_pause_resume(owner_client, automation_seeded, tenant, owner_user, settings):
    settings.GEMINI_API_KEY = ""
    Page.objects.create(
        tenant=tenant,
        title="מאמר",
        slug="article-1",
        full_path="/blog/article-1",
        locale="he",
        page_type=PageType.BLOG,
        status=PageStatus.PUBLISHED,
        created_by=owner_user,
    )
    create = owner_client.post(
        "/api/v1/automation/site-translations/",
        {"target_locales": ["en", "ar", "de"], "skip_existing": True},
        format="json",
    )
    assert create.status_code == 201
    job_id = create.json()["id"]

    run = owner_client.post(f"/api/v1/automation/{job_id}/run-next/")
    assert run.status_code == 200, run.content
    assert run.json()["completed_tasks"] == 1
    assert run.json()["progress_percent"] > 0

    pause = owner_client.post(f"/api/v1/automation/{job_id}/pause/")
    assert pause.status_code == 200
    assert pause.json()["status"] == JobStatus.PAUSED

    resume = owner_client.post(f"/api/v1/automation/{job_id}/resume/")
    assert resume.status_code == 200
    assert resume.json()["status"] == JobStatus.QUEUED

    while True:
        nxt = owner_client.post(f"/api/v1/automation/{job_id}/run-next/")
        assert nxt.status_code == 200
        data = nxt.json()
        if data["status"] == JobStatus.COMPLETED:
            break
        assert data["status"] in {JobStatus.RUNNING, JobStatus.QUEUED}

    assert Page.objects.filter(tenant=tenant, full_path="/blog/article-1", locale="en").exists()
    assert Page.objects.filter(tenant=tenant, full_path="/blog/article-1", locale="ar").exists()
    assert Page.objects.filter(tenant=tenant, full_path="/blog/article-1", locale="de").exists()


@pytest.mark.django_db
def test_site_translation_service_fallback(tenant, owner_user, automation_seeded, settings):
    settings.GEMINI_API_KEY = ""
    source = Page.objects.create(
        tenant=tenant,
        title="שירותים",
        slug="services",
        full_path="/services",
        locale="he",
        page_type=PageType.LANDING_PAGE,
        status=PageStatus.DRAFT,
        created_by=owner_user,
    )
    job = SiteTranslationService.create_job(
        tenant.id,
        owner_user,
        target_locales=["zh"],
        skip_existing=True,
    )
    assert job.steps.count() == 1
    JobExecutor.run_next_step(job)
    job.refresh_from_db()
    assert job.status == JobStatus.COMPLETED
    translated = Page.objects.get(tenant=tenant, full_path="/services", locale="zh")
    assert "[zh]" in translated.title
    assert translated.id != source.id
