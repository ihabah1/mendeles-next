import pytest


@pytest.mark.django_db
def test_control_center_api(api_client, super_admin_user):
    from conftest import auth_client

    client = auth_client(api_client, super_admin_user)
    response = client.get("/api/v1/admin/control-center/")
    assert response.status_code == 200
    body = response.json()
    assert "stats" in body
    assert "feature_flags" in body
    assert "recent_changes" in body
    assert "error_logs" in body
    assert "client_permissions" in body
    assert any(flag["slug"] == "gemini_ai" for flag in body["feature_flags"])


@pytest.mark.django_db
def test_disabling_gemini_flag_pauses_active_ai_jobs(api_client, super_admin_user, tenant):
    from automation.domain.enums import JobStatus, JobType
    from automation.infrastructure.models import AutomationJob, AutomationQueue
    from conftest import auth_client

    queue = AutomationQueue.objects.create(
        tenant=tenant,
        name="Default",
        slug="default",
        is_default=True,
    )
    job = AutomationJob.objects.create(
        tenant=tenant,
        queue=queue,
        created_by=super_admin_user,
        name="AI article",
        job_type=JobType.GENERATE_BLOG_ARTICLE,
        status=JobStatus.QUEUED,
    )

    client = auth_client(api_client, super_admin_user)
    response = client.patch(
        "/api/v1/settings/",
        {"features.gemini_ai": "false"},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["features.gemini_ai"] == "false"
    job.refresh_from_db()
    assert job.status == JobStatus.PAUSED
    assert "Gemini AI paused" in job.error_message


@pytest.mark.django_db
def test_error_report_api(api_client):
    response = api_client.post(
        "/api/v1/errors/report/",
        {"message": "Test frontend error", "source": "frontend"},
        format="json",
    )
    assert response.status_code == 201

    from audit.infrastructure.models import SiteErrorLog

    assert SiteErrorLog.objects.filter(message="Test frontend error").exists()
