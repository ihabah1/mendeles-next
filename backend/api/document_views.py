"""Documents platform API — business profile, templates, documents."""
from __future__ import annotations

import base64
import re
import secrets

from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from admin_panel.portal.models import BusinessProfile, Document, DocumentTemplate

from .services.document_generator import generate_document_content, guest_business_context
from .services.user_setup import ensure_customer_records

LOGO_DATA_RE = re.compile(r'^data:image/(png|jpeg|jpg|webp);base64,', re.I)
MAX_LOGO_BYTES = 400_000


def _document_number() -> str:
    return f'DOC-{timezone.now().strftime("%Y%m%d")}-{secrets.token_hex(3).upper()}'


def _serialize_template(tpl: DocumentTemplate) -> dict:
    return {
        'id': tpl.id,
        'slug': tpl.slug,
        'docType': tpl.doc_type,
        'name': tpl.name,
        'description': tpl.description,
        'fieldsSchema': tpl.fields_schema,
    }


def _serialize_document(doc: Document) -> dict:
    sig = getattr(doc, 'signature_request', None)
    return {
        'id': doc.id,
        'documentNumber': doc.document_number,
        'docType': doc.doc_type,
        'title': doc.title,
        'status': doc.status,
        'recipientName': doc.recipient_name,
        'recipientEmail': doc.recipient_email,
        'recipientPhone': doc.recipient_phone,
        'fieldsData': doc.fields_data,
        'notes': doc.notes,
        'templateId': doc.template_id,
        'sentAt': doc.sent_at.isoformat() if doc.sent_at else None,
        'signedAt': doc.signed_at.isoformat() if doc.signed_at else None,
        'createdAt': doc.created_at.isoformat(),
        'updatedAt': doc.updated_at.isoformat(),
        'signatureToken': sig.token if sig else None,
    }


def _serialize_business(bp: BusinessProfile) -> dict:
    return {
        'businessName': bp.business_name,
        'trade': bp.trade,
        'phone': bp.phone,
        'email': bp.email,
        'address': bp.address,
        'city': bp.city,
        'taxId': bp.tax_id,
        'logoUrl': bp.logo_url,
        'logoData': bp.logo_data or '',
        'hasLogo': bool(bp.logo_data or bp.logo_url),
    }


def _validate_logo_data(raw: str) -> str:
    value = (raw or '').strip()
    if not value:
        return ''
    if not LOGO_DATA_RE.match(value):
        raise ValueError('פורמט לוגו לא תקין — PNG, JPEG או WebP בלבד')
    try:
        b64 = value.split(',', 1)[1]
        if len(base64.b64decode(b64, validate=True)) > MAX_LOGO_BYTES:
            raise ValueError('הלוגו גדול מדי (מקסימום ~400KB)')
    except ValueError as exc:
        if 'גדול מדי' in str(exc) or 'פורמט' in str(exc):
            raise
        raise ValueError('קובץ לוגו לא תקין') from exc
    return value


def _ensure_business_profile(user) -> BusinessProfile:
    ensure_customer_records(user)
    bp, _ = BusinessProfile.objects.get_or_create(user=user)
    if not bp.business_name and user.full_name:
        bp.business_name = user.full_name
        bp.save(update_fields=['business_name', 'updated_at'])
    return bp


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def business_profile_view(request):
    """GET/PATCH /api/business-profile/"""
    bp = _ensure_business_profile(request.user)

    if request.method == 'GET':
        return Response(_serialize_business(bp))

    data = request.data
    field_map = {
        'businessName': 'business_name',
        'trade': 'trade',
        'phone': 'phone',
        'email': 'email',
        'address': 'address',
        'city': 'city',
        'taxId': 'tax_id',
        'logoUrl': 'logo_url',
        'logoData': 'logo_data',
    }
    updated = []
    for api_key, model_key in field_map.items():
        if api_key in data:
            value = data.get(api_key) or ''
            if model_key == 'logo_data' and value:
                try:
                    value = _validate_logo_data(str(value))
                except ValueError as exc:
                    return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            setattr(bp, model_key, value.strip() if model_key != 'logo_data' else value)
            updated.append(model_key)
    if updated:
        bp.save(update_fields=updated + ['updated_at'])
    return Response(_serialize_business(bp))


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def document_generate(request):
    """POST /api/documents/generate/ — topic + logo; guests OK, members persist."""
    topic = (request.data.get('topic') or '').strip()
    if not topic:
        return Response({'error': 'נושא המסמך נדרש'}, status=status.HTTP_400_BAD_REQUEST)

    doc_type_hint = (request.data.get('docType') or '').strip()
    logo_data_raw = request.data.get('logoData')
    business_name = (request.data.get('businessName') or '').strip()

    user = request.user if request.user.is_authenticated else None

    if user:
        bp = _ensure_business_profile(user)
        if logo_data_raw is not None:
            try:
                bp.logo_data = _validate_logo_data(str(logo_data_raw)) if logo_data_raw else ''
                bp.save(update_fields=['logo_data', 'updated_at'])
            except ValueError as exc:
                return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if business_name:
            bp.business_name = business_name[:160]
            bp.save(update_fields=['business_name', 'updated_at'])
    else:
        logo_preview = ''
        if logo_data_raw:
            try:
                logo_preview = _validate_logo_data(str(logo_data_raw))
            except ValueError as exc:
                return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        bp = guest_business_context(business_name=business_name, logo_data=logo_preview)

    try:
        generated = generate_document_content(topic, bp, doc_type_hint=doc_type_hint)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    template = generated.get('template')
    register_hint = (
        'הירשם בחינם כדי לשמור את המסמך, לייצא PDF ולשלוח לחתימה'
        if not user
        else ''
    )

    if not user:
        guest_doc = {
            'id': 0,
            'documentNumber': f'GUEST-{secrets.token_hex(3).upper()}',
            'docType': generated['docType'],
            'title': generated['title'],
            'status': 'draft',
            'recipientName': '',
            'recipientEmail': '',
            'recipientPhone': '',
            'fieldsData': generated.get('fieldsData') or {},
            'notes': (generated.get('notice') or '').strip(),
            'templateId': template.id if template else None,
            'sentAt': None,
            'signedAt': None,
            'createdAt': timezone.now().isoformat(),
            'updatedAt': timezone.now().isoformat(),
            'signatureToken': None,
            'guest': True,
        }
        return Response(
            {
                'document': guest_doc,
                'source': generated.get('source', 'local'),
                'notice': generated.get('notice', ''),
                'guest': True,
                'registerHint': register_hint,
                'business': {
                    'businessName': getattr(bp, 'business_name', ''),
                    'logoData': getattr(bp, 'logo_data', '') or '',
                    'hasLogo': bool(getattr(bp, 'logo_data', '') or getattr(bp, 'logo_url', '')),
                },
            },
            status=status.HTTP_201_CREATED,
        )

    doc = Document.objects.create(
        owner=user,
        template=template,
        document_number=_document_number(),
        doc_type=generated['docType'],
        title=generated['title'],
        fields_data=generated.get('fieldsData') or {},
        notes=(generated.get('notice') or '').strip(),
    )
    return Response(
        {
            'document': _serialize_document(doc),
            'source': generated.get('source', 'local'),
            'notice': generated.get('notice', ''),
            'guest': False,
            'registerHint': '',
            'business': _serialize_business(bp),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def document_templates_list(request):
    """GET /api/documents/templates/"""
    templates = DocumentTemplate.objects.filter(is_active=True)
    return Response({'templates': [_serialize_template(t) for t in templates]})


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def documents_list_create(request):
    """GET /api/documents/ — list; POST — create draft."""
    if request.method == 'GET':
        docs = Document.objects.filter(owner=request.user).select_related('signature_request')
        return Response({'documents': [_serialize_document(d) for d in docs]})

    doc_type = (request.data.get('docType') or '').strip()
    template_id = request.data.get('templateId')
    title = (request.data.get('title') or '').strip()

    template = None
    if template_id:
        template = DocumentTemplate.objects.filter(id=template_id, is_active=True).first()
        if not template:
            return Response({'error': 'תבנית לא נמצאה'}, status=status.HTTP_400_BAD_REQUEST)
        doc_type = template.doc_type

    valid_types = {c[0] for c in Document.DocType.choices}
    if doc_type not in valid_types:
        return Response({'error': 'סוג מסמך לא תקין'}, status=status.HTTP_400_BAD_REQUEST)

    if not title:
        type_labels = dict(Document.DocType.choices)
        title = type_labels.get(doc_type, 'מסמך חדש')

    doc = Document.objects.create(
        owner=request.user,
        template=template,
        document_number=_document_number(),
        doc_type=doc_type,
        title=title,
        recipient_name=(request.data.get('recipientName') or '').strip(),
        recipient_email=(request.data.get('recipientEmail') or '').strip(),
        recipient_phone=(request.data.get('recipientPhone') or '').strip(),
        fields_data=request.data.get('fieldsData') or {},
        notes=(request.data.get('notes') or '').strip(),
    )
    return Response(_serialize_document(doc), status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def document_detail(request, doc_id: int):
    """GET/PATCH/DELETE /api/documents/<id>/"""
    doc = Document.objects.filter(id=doc_id, owner=request.user).select_related('signature_request').first()
    if not doc:
        return Response({'error': 'מסמך לא נמצא'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(_serialize_document(doc))

    if request.method == 'DELETE':
        if doc.status not in (Document.Status.DRAFT, Document.Status.CANCELLED):
            return Response({'error': 'לא ניתן למחוק מסמך שנשלח'}, status=status.HTTP_400_BAD_REQUEST)
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    data = request.data
    updatable = {
        'title': 'title',
        'recipientName': 'recipient_name',
        'recipientEmail': 'recipient_email',
        'recipientPhone': 'recipient_phone',
        'fieldsData': 'fields_data',
        'notes': 'notes',
        'status': 'status',
    }
    updated = []
    for api_key, model_key in updatable.items():
        if api_key in data:
            value = data[api_key]
            if model_key == 'status':
                valid = {c[0] for c in Document.Status.choices}
                if value not in valid:
                    return Response({'error': 'סטטוס לא תקין'}, status=status.HTTP_400_BAD_REQUEST)
            setattr(doc, model_key, value)
            updated.append(model_key)
    if updated:
        doc.save(update_fields=updated + ['updated_at'])
    return Response(_serialize_document(doc))
