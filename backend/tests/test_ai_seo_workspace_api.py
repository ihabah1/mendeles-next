import pytest


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
