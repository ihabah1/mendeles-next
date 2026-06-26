"""Ensure every customer has the related portal records Django expects."""
from admin_panel.portal.models import BusinessProfile, CreditAccount, CustomerProfile


def ensure_customer_records(user) -> tuple[CustomerProfile, CreditAccount]:
    profile, _ = CustomerProfile.objects.get_or_create(user=user)
    credit, _ = CreditAccount.objects.get_or_create(customer=user)
    BusinessProfile.objects.get_or_create(
        user=user,
        defaults={'business_name': (user.full_name or '').strip()},
    )
    return profile, credit
