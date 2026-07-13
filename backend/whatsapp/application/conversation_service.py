from __future__ import annotations

from whatsapp.domain.enums import ConversationStatus, MessageDirection, MessageStatus
from whatsapp.infrastructure.models import Conversation, Message


class ConversationService:
    """Persist widget conversations — no WhatsApp send in Phase 1."""

    def create_conversation(self, *, visitor_id: str = "", locale: str = "") -> Conversation:
        return Conversation.objects.create(
            visitor_id=visitor_id,
            locale=locale,
            status=ConversationStatus.OPEN,
        )

    def add_message(
        self,
        conversation: Conversation,
        *,
        body: str,
        direction: str = MessageDirection.INBOUND,
    ) -> Message:
        return Message.objects.create(
            conversation=conversation,
            body=body.strip(),
            direction=direction,
            status=MessageStatus.PENDING,
        )

    def list_messages(self, conversation: Conversation) -> list[Message]:
        return list(conversation.messages.filter(deleted_at__isnull=True).order_by("created_at"))
