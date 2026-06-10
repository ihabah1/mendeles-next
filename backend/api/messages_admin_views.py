"""Staff API — compose and review customer inbox messages."""
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from admin_panel.portal.models import ActionLog, CustomerMessage

from api.permissions_views import _get_managed_user, _managed_users
from api.staff_permissions import IsStaffPortalUser

IsStaffUser = IsStaffPortalUser

CHANNEL_LABELS = dict(CustomerMessage.Channel.choices)
VALID_CHANNELS = set(CHANNEL_LABELS)


def _message_row(msg: CustomerMessage) -> dict:
    return {
        'id': msg.id,
        'channel': msg.channel,
        'channelLabel': CHANNEL_LABELS.get(msg.channel, msg.channel),
        'subject': msg.subject,
        'body': msg.body,
        'sentAt': msg.sent_at.isoformat(),
        'isRead': msg.is_read,
    }


def _messages_user_summary(user) -> dict:
    qs = user.messages.all()
    unread = qs.filter(is_read=False).count()
    last = qs.order_by('-sent_at').first()
    return {
        'id': user.id,
        'email': user.email,
        'displayName': user.display_name,
        'fullName': user.full_name or '',
        'phone': user.phone or '',
        'role': user.role,
        'roleLabel': user.get_role_display(),
        'dateJoined': user.date_joined.isoformat(),
        'messageCount': qs.count(),
        'unreadCount': unread,
        'lastMessageAt': last.sent_at.isoformat() if last else None,
        'lastSubject': last.subject if last else '',
    }


def _log_message_sent(request, customer, subject: str) -> None:
    ActionLog.objects.create(
        customer=customer,
        performed_by=request.user,
        event='message.sent',
        details=subject[:500],
    )


@api_view(['GET'])
@permission_classes([IsStaffUser])
def messages_users_list(request):
    q = (request.query_params.get('q') or '').strip()
    role = (request.query_params.get('role') or '').strip()

    qs = _managed_users()
    if q:
        qs = qs.filter(
            Q(email__icontains=q)
            | Q(full_name__icontains=q)
            | Q(first_name__icontains=q)
            | Q(phone__icontains=q)
            | Q(username__icontains=q),
        )
    if role in ('customer', 'team'):
        qs = qs.filter(role=role)

    users = [_messages_user_summary(u) for u in qs.order_by('-date_joined')[:300]]
    return Response({'users': users, 'count': len(users)})


@api_view(['GET', 'POST'])
@permission_classes([IsStaffUser])
def messages_user_detail(request, user_id: int):
    user = _get_managed_user(user_id)
    if not user:
        return Response({'error': 'משתמש לא נמצא'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        messages = [_message_row(m) for m in user.messages.order_by('-sent_at')[:100]]
        return Response({
            'user': _messages_user_summary(user),
            'messages': messages,
        })

    subject = (request.data.get('subject') or '').strip()
    body = (request.data.get('body') or '').strip()
    channel = (request.data.get('channel') or CustomerMessage.Channel.SYSTEM).strip()

    if not subject:
        return Response({'error': 'נושא חסר'}, status=status.HTTP_400_BAD_REQUEST)
    if not body:
        return Response({'error': 'תוכן חסר'}, status=status.HTTP_400_BAD_REQUEST)
    if len(subject) > 200:
        return Response({'error': 'נושא ארוך מדי'}, status=status.HTTP_400_BAD_REQUEST)
    if channel not in VALID_CHANNELS:
        return Response({'error': 'ערוץ לא תקין'}, status=status.HTTP_400_BAD_REQUEST)

    msg = CustomerMessage.objects.create(
        customer=user,
        channel=channel,
        subject=subject,
        body=body,
    )
    _log_message_sent(request, user, subject)

    return Response({
        'detail': 'הודעה נשלחה לתיבת הדואר של הלקוח',
        'message': _message_row(msg),
        'user': _messages_user_summary(user),
    }, status=status.HTTP_201_CREATED)
