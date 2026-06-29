import json
import logging
from datetime import datetime, timezone

from rest_framework.response import Response
from rest_framework.views import exception_handler

from core.exceptions.base import DomainException

logger = logging.getLogger(__name__)


def api_exception_handler(exc, context):
    if isinstance(exc, DomainException):
        return exc.to_response()

    response = exception_handler(exc, context)
    if response is not None:
        request = context.get("request")
        request_id = getattr(request, "request_id", None) if request else None
        if response.status_code >= 500:
            logger.error(
                "api_error",
                extra={
                    "request_id": request_id,
                    "status": response.status_code,
                    "detail": response.data,
                },
            )
        response.data = {
            "error": {
                "code": _code_for_status(response.status_code),
                "message": _message_from_data(response.data),
                "details": response.data if isinstance(response.data, dict) else {},
            }
        }
        return response

    logger.exception("unhandled_api_error", exc_info=exc)
    return Response(
        {
            "error": {
                "code": "internal_error",
                "message": "שגיאת שרת פנימית",
                "details": {},
            }
        },
        status=500,
    )


def _code_for_status(status: int) -> str:
    mapping = {
        400: "validation_error",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        429: "rate_limited",
    }
    return mapping.get(status, "error")


def _message_from_data(data) -> str:
    if isinstance(data, dict):
        if "detail" in data:
            detail = data["detail"]
            return str(detail)
        if "non_field_errors" in data:
            return str(data["non_field_errors"][0])
        first_key = next(iter(data))
        return f"{first_key}: {data[first_key]}"
    if isinstance(data, list) and data:
        return str(data[0])
    return "שגיאה בבקשה"


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }
        for key in ("request_id", "user_id", "tenant_id"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)
