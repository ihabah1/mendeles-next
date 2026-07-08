from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils import timezone

from core.exceptions.base import NotFoundError
from core.permissions.base import HasPermission
from identity.application.inbox_service import InboxService
from identity.application.user_service import UserManagementService


def _serialize_message(message) -> dict:
    return {
        "id": str(message.id),
        "subject": message.subject,
        "body": message.body,
        "sender_email": message.sender.email if message.sender else None,
        "sender_name": (
            f"{message.sender.first_name} {message.sender.last_name}".strip()
            if message.sender
            else None
        ),
        "read_at": message.read_at.isoformat() if message.read_at else None,
        "created_at": message.created_at.isoformat(),
    }


class InboxListView(APIView):
    def get(self, request):
        tenant_id = request.user.default_tenant_id
        unread = request.query_params.get("unread") == "1"
        messages = InboxService.list_for_user(
            tenant_id=tenant_id,
            user=request.user,
            unread_only=unread,
        )[:100]
        return Response(
            {
                "unread_count": InboxService.unread_count(tenant_id=tenant_id, user=request.user),
                "results": [_serialize_message(m) for m in messages],
            }
        )


class InboxMarkReadView(APIView):
    def post(self, request, message_id):
        from identity.infrastructure.models import UserInboxMessage

        updated = UserInboxMessage.objects.filter(
            id=message_id,
            recipient=request.user,
            read_at__isnull=True,
        ).update(read_at=timezone.now())
        if not updated:
            raise NotFoundError("הודעה לא נמצאה")
        return Response({"message": "סומן כנקרא"})


class InboxSendView(APIView):
    permission_classes = [HasPermission]
    required_permission = "users.edit"

    def post(self, request):
        recipient_id = request.data.get("recipient_id")
        subject = (request.data.get("subject") or "").strip()
        body = (request.data.get("body") or "").strip()
        broadcast = request.data.get("broadcast") is True
        recipient_ids = request.data.get("recipient_ids")

        if not subject or not body:
            return Response(
                {"error": {"code": "validation_error", "message": "נדרשים נושא ותוכן", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tenant_id = request.user.default_tenant_id

        if broadcast:
            count = InboxService.broadcast(
                tenant_id=tenant_id,
                sender=request.user,
                subject=subject,
                body=body,
                request=request,
                recipient_ids=recipient_ids,
            )
            return Response({"message": f"נשלחו {count} הודעות", "count": count})

        if not recipient_id:
            return Response(
                {"error": {"code": "validation_error", "message": "נדרש recipient_id", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        recipient = UserManagementService.get_user(recipient_id, tenant_id)
        message = InboxService.send_message(
            tenant_id=tenant_id,
            sender=request.user,
            recipient=recipient,
            subject=subject,
            body=body,
            request=request,
        )
        return Response(_serialize_message(message), status=status.HTTP_201_CREATED)
