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
