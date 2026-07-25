from social.application.campaign_report_service import campaign_tracking_code, tracked_website_url
from social.domain.enums import CampaignStatus
from social.infrastructure.models import SocialCampaign


def test_tracked_website_url_adds_utm(tenant, owner_user):
    campaign = SocialCampaign.objects.create(
        tenant=tenant,
        created_by=owner_user,
        title="UTM Campaign",
        website_url="https://mendeles.com/tools",
        platforms=["linkedin"],
        status=CampaignStatus.READY,
    )
    code = campaign_tracking_code(campaign)
    assert code.startswith("md-")
    url = tracked_website_url(campaign, platform="linkedin")
    assert "utm_source=mendeles" in url
    assert "utm_medium=social" in url
    assert f"utm_campaign={code}" in url
    assert "utm_content=linkedin" in url


def test_campaign_report_lists_published(tenant, owner_user, monkeypatch):
    from django.utils import timezone

    from social.application.campaign_report_service import CampaignReportService, campaign_tracking_code

    campaign = SocialCampaign.objects.create(
        tenant=tenant,
        created_by=owner_user,
        title="Published Report",
        website_url="https://mendeles.com",
        platforms=["instagram"],
        status=CampaignStatus.PUBLISHED,
        published_at=timezone.now(),
    )
    code = campaign_tracking_code(campaign)

    monkeypatch.setattr(
        CampaignReportService,
        "_fetch_ga4_campaign_sessions",
        lambda tenant_id, refresh=False: {
            "connected": True,
            "error": "",
            "by_campaign": {code: {"sessions": 12, "screenPageViews": 40, "activeUsers": 9}},
            "note": "test",
        },
    )

    report = CampaignReportService.build_report(tenant.id)
    assert report["ga4_connected"] is True
    assert report["rows"]
    row = next(r for r in report["rows"] if r["campaign_id"] == str(campaign.id))
    assert row["campaign_name"] == "Published Report"
    assert row["event_at"]
    assert row["sessions"] == 12
    assert row["pageviews"] == 40
    assert row["visits_available"] is True

    csv_body = CampaignReportService.export_csv(tenant.id)
    assert "Published Report" in csv_body
    assert "sessions" in csv_body
