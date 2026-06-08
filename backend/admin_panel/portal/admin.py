from django.contrib import admin

from .models import (
    ActionLog,
    ApprovedCombo,
    CreditAccount,
    CustomerMessage,
    CustomerPermission,
    CustomerProfile,
    LottoSet,
    Order,
    PrintAgentHeartbeat,
    PrintJob,
    ServiceFlag,
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
    readonly_fields = ('key', 'updated_at')
    search_fields = ('key', 'label')
