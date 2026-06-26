from django.contrib import admin

from .models import (
    ActionLog,
    ApprovedCombo,
    BusinessProfile,
    CreditAccount,
    CustomerMessage,
    CustomerPermission,
    CustomerProfile,
    Document,
    DocumentTemplate,
    Kiosk,
    LottoSet,
    Order,
    PrintAgentHeartbeat,
    PrintJob,
    ServiceFlag,
    SignatureRequest,
    Subscription,
)


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'city', 'created_at')
    search_fields = ('user__email', 'user__full_name', 'user__phone')


@admin.register(PrintJob)
class PrintJobAdmin(admin.ModelAdmin):
    list_display = ('order', 'status', 'priority', 'attempts', 'claimed_by_agent', 'created_at')
    list_filter = ('status',)
    search_fields = ('order__order_number', 'claimed_by_agent')


@admin.register(PrintAgentHeartbeat)
class PrintAgentHeartbeatAdmin(admin.ModelAdmin):
    list_display = ('agent_id', 'hostname', 'printer_ready', 'last_seen_at', 'updated_at')
    list_filter = ('printer_ready',)


@admin.register(Kiosk)
class KioskAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner_name', 'email', 'phone', 'location', 'price_per_table', 'is_active', 'last_login_at', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'email', 'location')
    readonly_fields = ('api_key', 'password_hash', 'last_login_at', 'created_at', 'updated_at')


admin.site.register(Order)
admin.site.register(CreditAccount)
admin.site.register(CustomerMessage)
admin.site.register(ActionLog)
admin.site.register(CustomerPermission)
admin.site.register(ApprovedCombo)
admin.site.register(Subscription)
admin.site.register(LottoSet)


@admin.register(ServiceFlag)
class ServiceFlagAdmin(admin.ModelAdmin):
    list_display = ('key', 'label', 'enabled', 'requires_restart', 'updated_at')
    list_editable = ('enabled',)


@admin.register(BusinessProfile)
class BusinessProfileAdmin(admin.ModelAdmin):
    list_display = ('business_name', 'user', 'trade', 'city', 'updated_at')
    search_fields = ('business_name', 'user__email', 'user__full_name')


@admin.register(DocumentTemplate)
class DocumentTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'doc_type', 'slug', 'is_active', 'sort_order')
    list_filter = ('doc_type', 'is_active')


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('document_number', 'title', 'owner', 'doc_type', 'status', 'created_at')
    list_filter = ('status', 'doc_type')
    search_fields = ('document_number', 'title', 'owner__email', 'recipient_name')


@admin.register(SignatureRequest)
class SignatureRequestAdmin(admin.ModelAdmin):
    list_display = ('document', 'status', 'token', 'created_at', 'signed_at')
    list_filter = ('status',)
    search_fields = ('token', 'document__document_number')
    readonly_fields = ('token', 'created_at')
