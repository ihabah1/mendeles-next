from django.urls import path

from leads.api.v1.views import (
    FormListView,
    LeadDetailView,
    LeadExportView,
    LeadListView,
    LeadNoteView,
    LeadStatusListView,
    PublicContactFormView,
    PublicLeadSubmitView,
)

urlpatterns = [
    path("", LeadListView.as_view(), name="leads-list"),
    path("export/", LeadExportView.as_view(), name="leads-export"),
    path("statuses/", LeadStatusListView.as_view(), name="leads-statuses"),
    path("forms/", FormListView.as_view(), name="leads-forms"),
    path("public/contact-form/", PublicContactFormView.as_view(), name="leads-public-contact-form"),
    path("public/submit/", PublicLeadSubmitView.as_view(), name="leads-public-submit"),
    path("<uuid:lead_id>/", LeadDetailView.as_view(), name="leads-detail"),
    path("<uuid:lead_id>/notes/", LeadNoteView.as_view(), name="leads-notes"),
]
