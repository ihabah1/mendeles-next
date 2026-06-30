import pytest


@pytest.mark.django_db
def test_owner_can_list_audit_logs(owner_client):
    response = owner_client.get("/api/v1/audit-logs/")
    assert response.status_code == 200
    assert "results" in response.json()


@pytest.mark.django_db
def test_read_only_can_list_audit_logs(readonly_client):
    response = readonly_client.get("/api/v1/audit-logs/")
    assert response.status_code == 200
