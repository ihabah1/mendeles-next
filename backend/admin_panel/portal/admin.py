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
    ServiceFlag,
    Subscription,
)


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'city', 'created_at')
    search_fields = ('user__email', 'user__full_name', 'user__phone')


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
