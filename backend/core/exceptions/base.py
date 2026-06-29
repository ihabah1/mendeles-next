from rest_framework import status
from rest_framework.response import Response


class DomainException(Exception):
    code: str = "domain_error"
    status_code: int = status.HTTP_400_BAD_REQUEST
    message: str = "שגיאה"

    def __init__(self, message: str | None = None, *, details: dict | None = None):
        if message:
            self.message = message
        self.details = details or {}

    def to_response(self) -> Response:
        return Response(
            {
                "error": {
                    "code": self.code,
                    "message": self.message,
                    "details": self.details,
                }
            },
            status=self.status_code,
        )


class NotFoundError(DomainException):
    code = "not_found"
    status_code = status.HTTP_404_NOT_FOUND
    message = "המשאב לא נמצא"


class ForbiddenError(DomainException):
    code = "forbidden"
    status_code = status.HTTP_403_FORBIDDEN
    message = "אין הרשאה לפעולה זו"


class ConflictError(DomainException):
    code = "conflict"
    status_code = status.HTTP_409_CONFLICT
    message = "קיים כבר משאב עם אותם נתונים"


class UnauthorizedError(DomainException):
    code = "unauthorized"
    status_code = status.HTTP_401_UNAUTHORIZED
    message = "נדרשת התחברות"


class ValidationError(DomainException):
    code = "validation_error"
    status_code = status.HTTP_400_BAD_REQUEST
    message = "נתונים לא תקינים"
