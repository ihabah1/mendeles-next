"""
Internal linking — delegates to content.InternalLinkService.

SEO app stub replaced by content architecture in Phase 2.5.
"""


def suggest_links(page, *, limit: int = 5) -> list[dict]:
    from content.application.internal_link_service import InternalLinkService

    return InternalLinkService.suggest_links(page, limit=limit)
