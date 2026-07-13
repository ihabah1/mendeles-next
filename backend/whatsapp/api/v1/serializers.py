from rest_framework import serializers

from whatsapp.infrastructure.models import ConnectionStatus, Conversation, Message


class ConnectionStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConnectionStatus
        fields = [
            "id",
            "provider",
            "status",
            "instance_name",
            "phone_number",
            "qr_status",
            "health",
            "last_sync_at",
            "last_error",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "direction", "body", "status", "created_at"]
        read_only_fields = fields


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ["id", "visitor_id", "status", "locale", "messages", "created_at"]
        read_only_fields = fields
