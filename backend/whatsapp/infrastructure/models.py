from django.db import models

from core.models import BaseModel
from whatsapp.domain.enums import (
    ConnectionState,
    ConversationStatus,
    HealthStatus,
    MessageDirection,
    MessageStatus,
    QrStatus,
    WhatsAppProviderType,
)


class ConnectionStatus(BaseModel):
    """Platform WhatsApp connection state (singleton row)."""

    provider = models.CharField(
        max_length=30,
        choices=WhatsAppProviderType.choices,
        default=WhatsAppProviderType.EVOLUTION,
    )
    status = models.CharField(
        max_length=30,
        choices=ConnectionState.choices,
        default=ConnectionState.NOT_CONNECTED,
        db_index=True,
    )
    instance_name = models.CharField(max_length=120, blank=True, default="")
    phone_number = models.CharField(max_length=40, blank=True, default="")
    qr_status = models.CharField(
        max_length=30,
        choices=QrStatus.choices,
        default=QrStatus.UNAVAILABLE,
    )
    health = models.CharField(
        max_length=30,
        choices=HealthStatus.choices,
        default=HealthStatus.UNKNOWN,
    )
    last_sync_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "whatsapp_connection_status"
        verbose_name = "WhatsApp connection status"
        verbose_name_plural = "WhatsApp connection statuses"

    def __str__(self) -> str:
        return f"{self.provider} — {self.status}"


class Conversation(BaseModel):
    """Visitor chat session from the public widget."""

    visitor_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    external_id = models.CharField(max_length=120, blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=ConversationStatus.choices,
        default=ConversationStatus.OPEN,
        db_index=True,
    )
    locale = models.CharField(max_length=10, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "whatsapp_conversations"
        indexes = [
            models.Index(fields=["visitor_id", "status", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"Conversation {self.id}"


class Message(BaseModel):
    """Message within a widget conversation."""

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    direction = models.CharField(max_length=20, choices=MessageDirection.choices)
    body = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=MessageStatus.choices,
        default=MessageStatus.PENDING,
    )
    provider_message_id = models.CharField(max_length=120, blank=True, default="")

    class Meta:
        db_table = "whatsapp_messages"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.direction}: {self.body[:40]}"
