class BreadcrumbService:
    """Reusable breadcrumb generation for all page types."""

    @staticmethod
    def build(items: list[dict]) -> list[dict]:
        """
        items: [{"name": "Home", "path": "/"}, {"name": "Solutions", "path": "/solutions"}]
        Returns normalized breadcrumb trail with position indices.
        """
        trail = []
        for idx, item in enumerate(items, start=1):
            trail.append(
                {
                    "position": idx,
                    "name": item.get("name", ""),
                    "path": item.get("path", ""),
                    "url": item.get("url") or item.get("path", ""),
                }
            )
        return trail

    @staticmethod
    def for_static_page(*, home_label: str, segments: list[dict]) -> list[dict]:
        return BreadcrumbService.build([{"name": home_label, "path": "/"}, *segments])
