"""
Internal linking engine — architecture placeholder for Phase 3+.

Future modules (landing pages, blog, industries) will register linkable content
and consume suggestions from this service.
"""


class InternalLinkingService:
    @staticmethod
    def register_content(**_kwargs) -> None:
        """Reserved: register a content node for internal linking graph."""
        raise NotImplementedError("Automatic internal linking is not implemented in Phase 2.")

    @staticmethod
    def suggest_links(**_kwargs) -> list[dict]:
        """Reserved: return suggested internal links for a page."""
        return []
