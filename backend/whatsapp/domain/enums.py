from django.db import models


class WhatsAppProviderType(models.TextChoices):
    EVOLUTION = "evolution", "Evolution API"
    META_CLOUD = "meta_cloud", "Meta Cloud API"
    TWILIO = "twilio", "Twilio"


class ConnectionState(models.TextChoices):
    NOT_CONNECTED = "not_connected", "Not connected"
    CONNECTING = "connecting", "Connecting"
    CONNECTED = "connected", "Connected"
    DISCONNECTED = "disconnected", "Disconnected"
    ERROR = "error", "Error"


class QrStatus(models.TextChoices):
    UNAVAILABLE = "unavailable", "Unavailable"
    PENDING = "pending", "Pending"
    SCANNED = "scanned", "Scanned"
    EXPIRED = "expired", "Expired"


class HealthStatus(models.TextChoices):
    HEALTHY = "healthy", "Healthy"
    DEGRADED = "degraded", "Degraded"
    DOWN = "down", "Down"
    UNKNOWN = "unknown", "Unknown"


class ConversationStatus(models.TextChoices):
    OPEN = "open", "Open"
    CLOSED = "closed", "Closed"


class MessageDirection(models.TextChoices):
    INBOUND = "inbound", "Inbound"
    OUTBOUND = "outbound", "Outbound"


class MessageStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SENT = "sent", "Sent"
    DELIVERED = "delivered", "Delivered"
    FAILED = "failed", "Failed"
