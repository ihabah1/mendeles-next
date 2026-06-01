"""Ensure every customer has the related portal records Django expects."""
from admin_panel.portal.models import CreditAccount, CustomerProfile


def ensure_customer_records(user) -> tuple[CustomerProfile, CreditAccount]:
    profile, _ = CustomerProfile.objects.get_or_create(user=user)
    credit, _ = CreditAccount.objects.get_or_create(customer=user)
    return profile, credit
