import pytest
from datetime import timedelta
from django.utils import timezone

from automation.domain.enums import JobStatus, StepStatus
from automation.infrastructure.models import AutomationJobStep


@pytest.mark.django_db
def test_ai_seo_workspace_lists_domains(owner_client):
    response = owner_client.get("/api/v1/ai-seo/workspace/")
    assert response.status_code == 200
    body = response.json()
    assert "domains" in body
    assert "jobs" in body
    assert "drafts" in body
    assert len(body["domains"]) > 5


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
    assert [step["name"] for step in jobs[0]["steps"]] == ["דאטה", "AI", "עיצוב", "הקמת דף", "סיום"]


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
    for _ in range(5):
        response = owner_client.post(f"/api/v1/ai-seo/workspace/jobs/{job_id}/run/")

    assert response is not None
    assert response.status_code == 200, response.content
    body = response.json()
    assert body["status"] == "completed"
    assert body["progress_percent"] == 100
    assert body["generated_page_id"]
    assert all(step["status"] == "completed" for step in body["steps"])
    assert body["logs"]


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
    assert first.json()["job"]["progress_percent"] == 20
    first_ai_step = next(step for step in first.json()["job"]["steps"] if step["step_type"] == "ai_seo.ai")
    assert first_ai_step["status"] == "running"
    assert first_ai_step["started_at"] is None
    assert second.json()["job"]["progress_percent"] == 40


@pytest.mark.django_db
def test_ai_seo_workspace_retry_failed_step(owner_client, settings, monkeypatch):
    settings.GEMINI_API_KEY = "test-key"

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
def test_ai_seo_workspace_marks_stale_running_step_failed(owner_client, settings):
    settings.GEMINI_API_KEY = "test-key"
    settings.AI_SEO_STEP_TIMEOUT_SECONDS = 1
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
    job_step.job.progress_percent = 20
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
