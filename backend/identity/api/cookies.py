from django.conf import settings


def set_refresh_cookie(response, token: str) -> None:
    max_age = int(settings.JWT_REFRESH_TTL.total_seconds())
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        token,
        max_age=max_age,
        httponly=True,
        secure=settings.JWT_REFRESH_COOKIE_SECURE,
        samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
        path=settings.JWT_REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response) -> None:
    response.delete_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        path=settings.JWT_REFRESH_COOKIE_PATH,
    )


def get_refresh_from_request(request) -> str | None:
    return request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
