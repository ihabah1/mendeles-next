from content.infrastructure.models import MediaAsset


class MediaService:
    @staticmethod
    def list_media(tenant_id, *, media_type=None):
        qs = MediaAsset.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)
        if media_type:
            qs = qs.filter(media_type=media_type)
        return qs.order_by("-created_at")

    @staticmethod
    def create_media(tenant_id, user, data: dict) -> MediaAsset:
        return MediaAsset.objects.create(
            tenant_id=tenant_id,
            media_type=data["media_type"],
            title=data["title"],
            url=data["url"],
            alt_text=data.get("alt_text", ""),
            mime_type=data.get("mime_type", ""),
            file_size=data.get("file_size"),
            uploaded_by=user,
        )

    @staticmethod
    def serialize_media(asset: MediaAsset) -> dict:
        return {
            "id": str(asset.id),
            "media_type": asset.media_type,
            "title": asset.title,
            "url": asset.url,
            "alt_text": asset.alt_text,
            "mime_type": asset.mime_type,
            "file_size": asset.file_size,
            "created_at": asset.created_at.isoformat(),
        }
