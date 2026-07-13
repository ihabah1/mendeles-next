from social.providers.buffer import BufferPublisher
from social.providers.base import SocialPublisher


def get_default_publisher() -> SocialPublisher:
    """Factory — swap or compose publishers when adding more networks."""
    return BufferPublisher()
