from django.contrib import admin

from whatsapp.infrastructure.models import ConnectionStatus, Conversation, Message


@admin.register(ConnectionStatus)
class ConnectionStatusAdmin(admin.ModelAdmin):
    list_display = ("provider", "status", "instance_name", "phone_number", "health", "last_sync_at")
    readonly_fields = ("created_at", "updated_at", "last_sync_at")


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "visitor_id", "status", "locale", "created_at")
    search_fields = ("visitor_id", "external_id")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "direction", "status", "created_at")
    search_fields = ("body", "provider_message_id")
    readonly_fields = ("created_at", "updated_at")
