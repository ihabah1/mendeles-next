from social.providers.base import SocialPublisher
from social.providers.composite import CompositeSocialPublisher


def get_default_publisher() -> SocialPublisher:
    """Factory — Buffer (3 channels) + direct Facebook Page via Meta Graph."""
    return CompositeSocialPublisher()
