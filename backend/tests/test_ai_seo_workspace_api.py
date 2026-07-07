import pytest
from datetime import timedelta
from django.utils import timezone

from automation.domain.enums import JobStatus, JobType, StepStatus
from automation.infrastructure.models import AutomationJob, AutomationJobStep
from content.domain.status import PageStatus
from content.infrastructure.models import Page
from integrations.domain.enums import GoogleServiceType, SyncStatus
from integrations.infrastructure.models import IntegrationSyncRecord
from ai_seo.application.generation_service import AiSeoGenerationService


@pytest.mark.django_db
def test_ai_seo_workspace_lists_domains(owner_client):
    response = owner_client.get("/api/v1/ai-seo/workspace/")
    assert response.status_code == 200
    body = response.json()
    assert "domains" in body
    assert "jobs" in body
    assert "drafts" in body
    assert "queue_stats" in body
    assert "waiting" in body["queue_stats"]
    assert "completed_today" in body["queue_stats"]
    assert len(body["domains"]) > 5


@pytest.mark.django_db
def test_ai_seo_workspace_lists_news_domains(owner_client):
    response = owner_client.get("/api/v1/ai-seo/workspace/")
    assert response.status_code == 200
    domains = {item["value"]: item["label"] for item in response.json()["domains"]}
    assert domains.get("sports") == "ספורט"
    assert domains.get("economy") == "כלכלה"
    assert domains.get("current_affairs") == "אקטואליה"
    assert domains.get("world_news") == "בעולם"


@pytest.mark.django_db
def test_ai_seo_resolve_news_event_from_trends(tenant):
    IntegrationSyncRecord.objects.create(
        tenant=tenant,
        service_type=GoogleServiceType.TRENDS,
        source="pytrends",
        language="he",
        country="IL",
        retrieved_at=timezone.now(),
        sync_status=SyncStatus.SUCCESS,
        processed_data={
            "trending_searches": [["כדורגל ליגת העל"], ["בורסה תל אביב"]],
            "related_queries": {},
        },
    )
    event = AiSeoGenerationService._resolve_news_event(
        tenant.id,
        {"value": "sports", "label": "ספורט", "keywords": ["ספורט"]},
        ["ספורט"],
    )
    assert event is not None
    assert "כדורגל" in event["topic"]
    assert event["source"] == "google_trends"


@pytest.mark.django_db
def test_ai_seo_workspace_generate_news_domain_stores_event(owner_client, settings, tenant):
    settings.GEMINI_API_KEY = "test-key"
    IntegrationSyncRecord.objects.create(
        tenant=tenant,
        service_type=GoogleServiceType.TRENDS,
        source="pytrends",
        language="he",
        country="IL",
        retrieved_at=timezone.now(),
        sync_status=SyncStatus.SUCCESS,
        processed_data={
            "trending_searches": [["אינפלציה בישראל"]],
            "related_queries": {},
        },
    )
    response = owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {"domains": ["economy"], "output_types": ["blog"], "keywords": ["כלכלה"]},
        format="json",
    )
    assert response.status_code == 201, response.content
    job = response.json()["jobs"][0]
    assert job["config"]["news_event"]["topic"]
    assert job["config"]["news_event"]["domain"] == "economy"
    assert "אינפלציה" in job["config"]["keywords"][0]


@pytest.mark.django_db
def test_ai_seo_workspace_generate_news_hot_topics_batch(owner_client, settings, tenant):
    settings.GEMINI_API_KEY = "test-key"
    IntegrationSyncRecord.objects.create(
        tenant=tenant,
        service_type=GoogleServiceType.TRENDS,
        source="pytrends",
        language="he",
        country="IL",
        retrieved_at=timezone.now(),
        sync_status=SyncStatus.SUCCESS,
        processed_data={
            "trending_searches": [["מבזק חדשות הלילה"]],
            "related_queries": {},
        },
    )
    response = owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {
            "domains": [],
            "output_types": ["blog", "landing_page"],
            "news_hot_topics_enabled": True,
            "recurrence_minutes": 180,
            "auto_publish_enabled": True,
        },
        format="json",
    )
    assert response.status_code == 201, response.content
    jobs = response.json()["jobs"]
    assert len(jobs) == 2
    assert all(job["config"]["news_hot_topics_enabled"] for job in jobs)
    assert jobs[0]["config"]["news_event"]["topic"]
    assert jobs[0]["config"]["recurrence_minutes"] == 180


@pytest.mark.django_db
def test_ai_seo_workspace_generate_requires_gemini(owner_client, settings):
    settings.GEMINI_API_KEY = ""
    response = owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {"domains": ["law"], "output_types": ["blog"]},
        format="json",
    )
    assert response.status_code == 400
    assert "GEMINI_API_KEY" in response.json()["error"]


def test_ai_seo_visual_asset_matches_domain():
    asset = AiSeoGenerationService._random_visual_asset({"value": "insurance"})
    assert asset["matched_domain"] == "insurance"
    assert "car" in asset["alt"].lower() or "driver" in asset["alt"].lower() or "vehicle" in asset["alt"].lower()


def test_ai_seo_visual_asset_matches_keyword_context():
    asset = AiSeoGenerationService._random_visual_asset(
        {"value": "custom", "label": "נושא חופשי"},
        keywords=["קליניקה פרטית", "קביעת תור לרופא"],
    )
    assert asset["matched_domain"] == "medical"
    assert "clinic" in asset["alt"].lower() or "medical" in asset["alt"].lower() or "healthcare" in asset["alt"].lower()


@pytest.mark.django_db
def test_ai_seo_workspace_research_lists_trends_phrases(owner_client, tenant):
    IntegrationSyncRecord.objects.create(
        tenant=tenant,
        service_type=GoogleServiceType.TRENDS,
        source="pytrends",
        language="he",
        country="IL",
        retrieved_at=timezone.now(),
        sync_status=SyncStatus.SUCCESS,
        processed_data={
            "keywords": ["עורך דין"],
            "related_queries": {
                "עורך דין": {
                    "top": [
                        {"query": "עורך דין תעבורה", "value": 100},
                        {"query": "עורך דין פלילי", "value": 85},
                    ]
                }
            },
        },
    )

    response = owner_client.get("/api/v1/ai-seo/workspace/research/")

    assert response.status_code == 200
    body = response.json()
    assert body["available"] is True
    assert body["items"][0]["keyword"] == "עורך דין תעבורה"
    assert body["items"][0]["volume"] == 100
    assert body["items"][0]["category"] == "עריכת דין"


@pytest.mark.django_db
def test_ai_seo_workspace_generate_creates_batch_job(owner_client, settings):
    settings.GEMINI_API_KEY = "test-key"
    response = owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {"domains": ["law"], "output_types": ["blog", "landing_page"], "keywords": ["עורך דין"]},
        format="json",
    )
    assert response.status_code == 201, response.content
    jobs = response.json()["jobs"]
    assert len(jobs) == 2
    assert {job["job_type"] for job in jobs} == {"generate_blog_article", "generate_landing_page"}
    assert [step["name"] for step in jobs[0]["steps"]] == ["דאטה", "AI", "עיצוב", "הקמת דף", "סיום", "העלאה לפרודקשן"]


@pytest.mark.django_db
def test_ai_seo_workspace_random_topics_and_history(owner_client, settings):
    settings.GEMINI_API_KEY = "test-key"
    response = owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {
            "domains": [],
            "output_types": ["blog"],
            "random_topics_enabled": True,
            "random_topic_count": 2,
            "auto_publish_enabled": True,
            "publish_at": (timezone.now() + timedelta(days=1)).isoformat(),
        },
        format="json",
    )
    assert response.status_code == 201, response.content
    jobs = response.json()["jobs"]
    assert len(jobs) == 2
    assert all(job["config"]["random_topics_enabled"] for job in jobs)
    assert all(job["config"]["publish_at"] for job in jobs)

    workspace = owner_client.get("/api/v1/ai-seo/workspace/")
    assert workspace.status_code == 200
    assert workspace.json()["history"]


@pytest.mark.django_db
def test_ai_seo_workspace_run_job_processes_steps(owner_client, settings, monkeypatch):
    settings.GEMINI_API_KEY = "test-key"

    def fake_generate_json(prompt):
        return {
            "title": "דף בדיקה",
            "meta_title": "דף בדיקה",
            "meta_description": "תיאור בדיקה",
            "blocks": [{"type": "hero", "config": {"headline": "כותרת", "cta": "דברו איתנו"}}],
        }

    monkeypatch.setattr(
        "ai_seo.application.gemini_service.GeminiService.generate_json",
        fake_generate_json,
    )
    create = owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {"domains": ["law"], "output_types": ["landing_page"], "keywords": ["עורך דין"]},
        format="json",
    )
    job_id = create.json()["jobs"][0]["id"]

    response = None
    for _ in range(6):
        response = owner_client.post(f"/api/v1/ai-seo/workspace/jobs/{job_id}/run/")

    assert response is not None
    assert response.status_code == 200, response.content
    body = response.json()
    assert body["status"] == "waiting_approval"
    publish_step = next(step for step in body["steps"] if step["step_type"] == "ai_seo.publish")
    assert publish_step["status"] == "waiting_approval"
    assert body["generated_page_id"]

    publish = owner_client.post(f"/api/v1/ai-seo/workspace/jobs/{job_id}/publish/")

    assert publish.status_code == 200, publish.content
    body = publish.json()
    assert body["status"] == "completed"
    assert body["progress_percent"] == 100
    assert all(step["status"] == "completed" for step in body["steps"])
    assert body["logs"]


@pytest.mark.django_db
def test_ai_seo_workspace_auto_publishes_generated_page(owner_client, settings, monkeypatch):
    settings.GEMINI_API_KEY = "test-key"

    def fake_generate_json(prompt):
        return {
            "title": "דף פרסום אוטומטי",
            "meta_title": "דף פרסום אוטומטי",
            "meta_description": "תיאור",
            "blocks": [{"type": "hero", "config": {"headline": "כותרת"}}],
        }

    monkeypatch.setattr(
        "ai_seo.application.gemini_service.GeminiService.generate_json",
        fake_generate_json,
    )
    create = owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {
            "domains": ["law"],
            "output_types": ["landing_page"],
            "keywords": ["עורך דין"],
            "auto_publish_enabled": True,
        },
        format="json",
    )
    job_id = create.json()["jobs"][0]["id"]
    response = None
    for _ in range(6):
        response = owner_client.post(f"/api/v1/ai-seo/workspace/jobs/{job_id}/run/")

    page = Page.objects.get(id=response.json()["generated_page_id"])
    assert page.status == PageStatus.PUBLISHED


@pytest.mark.django_db
def test_ai_seo_workspace_schedules_next_recurring_job(owner_client, settings, monkeypatch):
    settings.GEMINI_API_KEY = "test-key"

    def fake_generate_json(prompt):
        return {
            "title": "דף מחזורי",
            "meta_title": "דף מחזורי",
            "meta_description": "תיאור",
            "blocks": [{"type": "hero", "config": {"headline": "כותרת"}}],
        }

    monkeypatch.setattr(
        "ai_seo.application.gemini_service.GeminiService.generate_json",
        fake_generate_json,
    )
    create = owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {
            "domains": ["law"],
            "output_types": ["landing_page"],
            "keywords": ["עורך דין"],
            "recurrence_interval": "hourly",
            "auto_publish_enabled": True,
        },
        format="json",
    )
    job_id = create.json()["jobs"][0]["id"]
    response = None
    for _ in range(6):
        response = owner_client.post(f"/api/v1/ai-seo/workspace/jobs/{job_id}/run/")

    next_job_id = response.json()["config"]["next_recurring_job_id"]
    next_job = AutomationJob.objects.get(id=next_job_id)
    assert next_job.status == JobStatus.SCHEDULED
    assert next_job.scheduled_at is not None
    assert next_job.parent_job_id == AutomationJob.objects.get(id=job_id).id

    workspace = owner_client.get("/api/v1/ai-seo/workspace/")
    assert workspace.status_code == 200
    automation = workspace.json()["scheduled_automation"]
    assert automation is not None
    assert automation["active"] is True
    assert automation["recurrence_interval"] == "hourly"
    assert next_job_id in automation["job_ids"]

    disable = owner_client.post("/api/v1/ai-seo/workspace/scheduled-automation/disable/")
    assert disable.status_code == 200
    body = disable.json()
    assert next_job_id in body["cancelled_job_ids"]
    assert body["scheduled_automation"] is None
    next_job.refresh_from_db()
    assert next_job.status == JobStatus.CANCELLED
    parent = AutomationJob.objects.get(id=job_id)
    assert parent.config.get("recurrence_interval") == ""


@pytest.mark.django_db
def test_ai_seo_workspace_scheduled_automation_for_pending_recurring_batch(owner_client, settings, tenant):
    settings.GEMINI_API_KEY = "test-key"
    IntegrationSyncRecord.objects.create(
        tenant=tenant,
        service_type=GoogleServiceType.TRENDS,
        source="pytrends",
        language="he",
        country="IL",
        retrieved_at=timezone.now(),
        sync_status=SyncStatus.SUCCESS,
        processed_data={
            "trending_searches": [["מבזק חדשות הלילה"]],
            "related_queries": {},
        },
    )
    owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {
            "domains": [],
            "output_types": ["blog", "landing_page"],
            "news_hot_topics_enabled": True,
            "recurrence_minutes": 180,
            "auto_publish_enabled": True,
        },
        format="json",
    )
    workspace = owner_client.get("/api/v1/ai-seo/workspace/")
    automation = workspace.json()["scheduled_automation"]
    assert automation is not None
    assert automation["news_hot_topics_enabled"] is True
    assert automation["recurrence_minutes"] == 180
    assert automation["pending_jobs_count"] >= 1


@pytest.mark.django_db
def test_ai_seo_workspace_schedules_recurring_without_auto_publish(owner_client, settings, monkeypatch):
    settings.GEMINI_API_KEY = "test-key"

    def fake_generate_json(prompt):
        return {
            "title": "דף מחזורי ללא פרסום",
            "meta_title": "דף מחזורי ללא פרסום",
            "meta_description": "תיאור",
            "blocks": [{"type": "hero", "config": {"headline": "כותרת"}}],
        }

    monkeypatch.setattr(
        "ai_seo.application.gemini_service.GeminiService.generate_json",
        fake_generate_json,
    )
    create = owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {
            "domains": ["law"],
            "output_types": ["landing_page"],
            "keywords": ["עורך דין"],
            "recurrence_minutes": 60,
        },
        format="json",
    )
    job_id = create.json()["jobs"][0]["id"]
    response = None
    for _ in range(6):
        response = owner_client.post(f"/api/v1/ai-seo/workspace/jobs/{job_id}/run/")

    assert response is not None
    assert response.status_code == 200, response.content
    body = response.json()
    assert body["status"] == "waiting_approval"
    next_job_id = body["config"]["next_recurring_job_id"]
    next_job = AutomationJob.objects.get(id=next_job_id)
    assert next_job.status == JobStatus.SCHEDULED
    assert next_job.scheduled_at is not None


@pytest.mark.django_db
def test_ai_seo_workspace_promotes_due_scheduled_jobs(owner_client, settings, tenant, owner_user):
    settings.GEMINI_API_KEY = "test-key"
    from automation.infrastructure.models import AutomationQueue

    queue, _ = AutomationQueue.objects.get_or_create(
        tenant=tenant,
        slug="default",
        defaults={"name": "Default", "is_default": True},
    )
    job = AutomationJob.objects.create(
        tenant=tenant,
        queue=queue,
        name="Scheduled recurring job",
        job_type=JobType.GENERATE_BLOG_ARTICLE,
        status=JobStatus.SCHEDULED,
        scheduled_at=timezone.now() - timedelta(minutes=5),
        created_by=owner_user,
        config={"recurrence_minutes": 120},
    )

    owner_client.get("/api/v1/ai-seo/workspace/")
    job.refresh_from_db()

    assert job.status == JobStatus.QUEUED


@pytest.mark.django_db
def test_ai_seo_workspace_delete_page(owner_client, tenant, owner_user):
    page = Page.objects.create(
        tenant=tenant,
        title="למחיקה",
        slug="delete-me",
        full_path="/delete-me",
        page_type="landing_page",
        locale="he",
        created_by=owner_user,
    )

    response = owner_client.delete(f"/api/v1/ai-seo/workspace/pages/{page.id}/delete/")
    page.refresh_from_db()

    assert response.status_code == 204
    assert page.deleted_at is not None


@pytest.mark.django_db
def test_ai_seo_workspace_regenerate_reuses_original_keywords(owner_client, settings, monkeypatch):
    settings.GEMINI_API_KEY = "test-key"

    def fake_generate_json(prompt):
        return {
            "title": "דף בדיקה",
            "meta_title": "דף בדיקה",
            "meta_description": "תיאור בדיקה",
            "blocks": [{"type": "hero", "config": {"headline": "כותרת", "cta": "דברו איתנו"}}],
        }

    monkeypatch.setattr(
        "ai_seo.application.gemini_service.GeminiService.generate_json",
        fake_generate_json,
    )
    create = owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {"domains": ["law"], "output_types": ["landing_page"], "keywords": ["עורך דין"]},
        format="json",
    )
    job_id = create.json()["jobs"][0]["id"]
    generated = None
    for _ in range(5):
        generated = owner_client.post(f"/api/v1/ai-seo/workspace/jobs/{job_id}/run/")

    page_id = generated.json()["generated_page_id"]
    regenerate = owner_client.post(
        "/api/v1/ai-seo/workspace/regenerate/",
        {"page_id": page_id, "feedback": "שפר את הכותרת"},
        format="json",
    )

    assert regenerate.status_code == 201, regenerate.content
    regenerated_job = regenerate.json()
    assert regenerated_job["config"]["keywords"] == ["עורך דין"]

    first_step = owner_client.post(f"/api/v1/ai-seo/workspace/jobs/{regenerated_job['id']}/run/")
    assert first_step.status_code == 200, first_step.content
    assert first_step.json()["progress_percent"] == 16


@pytest.mark.django_db
def test_ai_seo_workspace_run_next_processes_one_step_at_a_time(owner_client, settings, monkeypatch):
    settings.GEMINI_API_KEY = "test-key"

    def fake_generate_json(prompt):
        return {
            "title": "דף תור",
            "meta_title": "דף תור",
            "meta_description": "תיאור תור",
            "blocks": [{"type": "hero", "config": {"headline": "כותרת"}}],
        }

    monkeypatch.setattr(
        "ai_seo.application.gemini_service.GeminiService.generate_json",
        fake_generate_json,
    )
    create = owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {"domains": ["law"], "output_types": ["landing_page"], "keywords": ["עורך דין"]},
        format="json",
    )
    job_id = create.json()["jobs"][0]["id"]

    first = owner_client.post("/api/v1/ai-seo/workspace/queue/run-next/")
    second = owner_client.post("/api/v1/ai-seo/workspace/queue/run-next/")

    assert first.status_code == 200, first.content
    assert first.json()["job"]["id"] == job_id
    assert first.json()["job"]["progress_percent"] == 16
    first_ai_step = next(step for step in first.json()["job"]["steps"] if step["step_type"] == "ai_seo.ai")
    assert first_ai_step["status"] == "running"
    assert first_ai_step["started_at"] is None
    assert second.json()["job"]["progress_percent"] == 33


@pytest.mark.django_db
def test_ai_seo_workspace_retry_failed_step(owner_client, settings, monkeypatch):
    settings.GEMINI_API_KEY = "test-key"
    settings.AI_SEO_STEP_MAX_RETRIES = 0

    def broken_generate_json(prompt):
        raise RuntimeError("Gemini timeout")

    monkeypatch.setattr(
        "ai_seo.application.gemini_service.GeminiService.generate_json",
        broken_generate_json,
    )
    create = owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {"domains": ["law"], "output_types": ["landing_page"], "keywords": ["עורך דין"]},
        format="json",
    )
    owner_client.post("/api/v1/ai-seo/workspace/queue/run-next/")
    failed = owner_client.post("/api/v1/ai-seo/workspace/queue/run-next/").json()["job"]
    failed_step = next(step for step in failed["steps"] if step["status"] == "failed")

    response = owner_client.post(f"/api/v1/ai-seo/workspace/jobs/{failed['id']}/steps/{failed_step['id']}/retry/")

    assert response.status_code == 200, response.content
    body = response.json()
    retried_step = next(step for step in body["steps"] if step["id"] == failed_step["id"])
    assert retried_step["status"] == "pending"
    assert body["status"] == "running"


@pytest.mark.django_db
def test_ai_seo_workspace_auto_retries_failed_step(owner_client, settings, monkeypatch):
    settings.GEMINI_API_KEY = "test-key"
    settings.AI_SEO_STEP_MAX_RETRIES = 3

    def broken_generate_json(prompt):
        raise RuntimeError("Gemini timeout")

    monkeypatch.setattr(
        "ai_seo.application.gemini_service.GeminiService.generate_json",
        broken_generate_json,
    )
    create = owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {"domains": ["law"], "output_types": ["landing_page"], "keywords": ["עורך דין"]},
        format="json",
    )
    owner_client.post("/api/v1/ai-seo/workspace/queue/run-next/")

    response = owner_client.post("/api/v1/ai-seo/workspace/queue/run-next/")

    assert response.status_code == 200, response.content
    job = response.json()["job"]
    ai_step = next(step for step in job["steps"] if step["step_type"] == "ai_seo.ai")
    assert job["status"] == "running"
    assert ai_step["status"] == "running"
    assert ai_step["started_at"] is None
    assert ai_step["retry_count"] == 1


@pytest.mark.django_db
def test_ai_seo_workspace_marks_stale_running_step_failed(owner_client, settings):
    settings.GEMINI_API_KEY = "test-key"
    settings.AI_SEO_STEP_TIMEOUT_SECONDS = 1
    settings.AI_SEO_STEP_MAX_RETRIES = 0
    create = owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {"domains": ["law"], "output_types": ["landing_page"], "keywords": ["עורך דין"]},
        format="json",
    )
    job_id = create.json()["jobs"][0]["id"]
    job_step = AutomationJobStep.objects.filter(job_id=job_id, step_type="ai_seo.ai").first()
    job_step.status = StepStatus.RUNNING
    job_step.started_at = timezone.now() - timedelta(seconds=5)
    job_step.save(update_fields=["status", "started_at", "updated_at"])
    job_step.job.status = JobStatus.RUNNING
    job_step.job.progress_percent = 16
    job_step.job.save(update_fields=["status", "progress_percent", "updated_at"])

    response = owner_client.get("/api/v1/ai-seo/workspace/")

    assert response.status_code == 200
    job = next(item for item in response.json()["jobs"] if item["id"] == job_id)
    ai_step = next(step for step in job["steps"] if step["step_type"] == "ai_seo.ai")
    assert job["status"] == "failed"
    assert ai_step["status"] == "failed"
    assert "timed out" in ai_step["error_message"]


@pytest.mark.django_db
def test_ai_seo_workspace_cancel_job(owner_client, settings):
    settings.GEMINI_API_KEY = "test-key"
    create = owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {"domains": ["law"], "output_types": ["landing_page"], "keywords": ["עורך דין"]},
        format="json",
    )
    job_id = create.json()["jobs"][0]["id"]

    response = owner_client.post(f"/api/v1/ai-seo/workspace/jobs/{job_id}/cancel/")

    assert response.status_code == 200, response.content
    assert response.json()["status"] == "cancelled"


@pytest.mark.django_db
def test_ai_seo_workspace_delete_job_auto_cancels(owner_client, settings):
    settings.GEMINI_API_KEY = "test-key"
    create = owner_client.post(
        "/api/v1/ai-seo/workspace/generate/",
        {"domains": ["law"], "output_types": ["landing_page"], "keywords": ["עורך דין"]},
        format="json",
    )
    job_id = create.json()["jobs"][0]["id"]

    response = owner_client.delete(f"/api/v1/ai-seo/workspace/jobs/{job_id}/delete/")
    workspace = owner_client.get("/api/v1/ai-seo/workspace/")

    assert response.status_code == 204, response.content
    assert all(job["id"] != job_id for job in workspace.json()["jobs"])


@pytest.mark.django_db
def test_ai_seo_workspace_swap_page_image(owner_client, tenant, owner_user):
    from content.application.block_service import BlockService

    page = Page.objects.create(
        tenant=tenant,
        title="כתבה לבדיקה",
        slug="swap-image-test",
        full_path="/blog/swap-image-test",
        page_type="blog",
        locale="he",
        created_by=owner_user,
    )
    BlockService.create_block(
        page,
        {
            "block_type": "image",
            "sort_order": 0,
            "config": {"url": "https://example.com/old.jpg", "source": "test"},
        },
    )

    response = owner_client.post(f"/api/v1/ai-seo/workspace/pages/{page.id}/swap-image/")
    assert response.status_code == 200, response.content
    body = response.json()
    assert body["image"] is not None
    assert body["image"].get("url")
    assert body["image"]["url"] != "https://example.com/old.jpg"


@pytest.mark.django_db
def test_ai_seo_workspace_swap_page_image_with_domain_and_context(owner_client, tenant, owner_user):
    from content.application.block_service import BlockService

    page = Page.objects.create(
        tenant=tenant,
        title="כתבה על רכבת",
        slug="train-article",
        full_path="/blog/train-article",
        page_type="blog",
        locale="he",
        created_by=owner_user,
    )
    BlockService.create_block(
        page,
        {
            "block_type": "image",
            "sort_order": 0,
            "config": {"url": "https://example.com/old.jpg", "source": "test"},
        },
    )

    response = owner_client.post(
        f"/api/v1/ai-seo/workspace/pages/{page.id}/swap-image/",
        {"domain": "automotive", "context": "רכבת ישראל תחבורה"},
        format="json",
    )
    assert response.status_code == 200, response.content
    body = response.json()
    assert body["image"] is not None
    assert body["image"].get("url")
    assert body["image"]["url"] != "https://example.com/old.jpg"
    assert body["image"].get("matched_domain") == "automotive"
