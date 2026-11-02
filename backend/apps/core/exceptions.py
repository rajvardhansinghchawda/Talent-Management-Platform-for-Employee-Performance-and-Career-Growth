from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def _build_error_response(
    code: str, message: str, details: dict | None = None, status_code: int = 400
) -> Response:
    """Build a standardized error response."""
    payload: dict = {"error": {"code": code, "message": message}}
    if details:
        payload["error"]["details"] = details
    return Response(payload, status=status_code)


def custom_exception_handler(exc, context) -> Response | None:
    """
    Maps all exceptions to the standard error format:
    { "error": { "code": "...", "message": "...", "details": {...} } }
    """
    # Convert Django exceptions to DRF equivalents first
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, PermissionDenied):
        exc = exceptions.PermissionDenied()
    elif isinstance(exc, DjangoValidationError):
        exc = exceptions.ValidationError(
            detail=exc.message_dict if hasattr(exc, "message_dict") else exc.messages
        )

    # Handle domain-level exceptions
    if isinstance(exc, DomainException):
        code = getattr(exc, "default_code", "domain_error")
        if exc.details and isinstance(exc.details, dict) and "code" in exc.details:
            code = exc.details["code"]
        return _build_error_response(
            code=code,
            message=exc.message,
            details=exc.details,
            status_code=exc.status_code,
        )

    # Let DRF process it first to get the response
    response = drf_exception_handler(exc, context)

    if response is None:
        # Unhandled exception — return generic server error
        return _build_error_response(
            code="server_error",
            message="An unexpected error occurred.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Map DRF exceptions to standard format
    if isinstance(exc, exceptions.ValidationError):
        return _build_error_response(
            code="validation_error",
            message="Invalid input.",
            details=response.data,
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    elif isinstance(exc, exceptions.AuthenticationFailed):
        return _build_error_response(
            code="authentication_failed",
            message=str(exc.detail),
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    elif isinstance(exc, exceptions.NotAuthenticated):
        return _build_error_response(
            code="authentication_failed",
            message="Authentication credentials were not provided.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    elif isinstance(exc, exceptions.PermissionDenied):
        details = None
        if hasattr(exc, "detail") and isinstance(exc.detail, dict):
            details = exc.detail
        return _build_error_response(
            code="permission_denied",
            message=str(exc.detail) if not isinstance(exc.detail, dict) else "Permission denied.",
            details=details,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    elif isinstance(exc, exceptions.NotFound):
        return _build_error_response(
            code="not_found",
            message="Not found.",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    elif isinstance(exc, exceptions.MethodNotAllowed):
        return _build_error_response(
            code="method_not_allowed",
            message=f"Method '{exc.args[0]}' not allowed.",
            status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
    elif isinstance(exc, exceptions.Throttled):
        return _build_error_response(
            code="rate_limited",
            message="Request was throttled.",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    # Fallback for any other DRF exception
    return _build_error_response(
        code="server_error",
        message="An error occurred.",
        details=response.data
        if isinstance(response.data, dict)
        else {"detail": str(response.data)},
        status_code=response.status_code,
    )


class DomainException(Exception):
    """Base class for domain-level exceptions that map to HTTP responses."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "domain_error"
    default_message = "A domain error occurred."

    def __init__(
        self,
        message: str | None = None,
        details: dict | None = None,
        code: str | None = None,
        status_code: int | None = None,
        *args,
        **kwargs,
    ):
        self.message = message or self.default_message
        self.details = details or {}
        if status_code is not None:
            self.status_code = status_code
        if code:
            self.code = code
            if isinstance(self.details, dict) and "code" not in self.details:
                self.details["code"] = code
        else:
            self.code = getattr(self, "default_code", "domain_error")
        super().__init__(self.message, *args)


class StateConflict(DomainException):
    """Raised when an action is invalid given the current state of an object."""

    status_code = status.HTTP_409_CONFLICT
    default_code = "state_conflict"
    default_message = "Action not allowed in current state."


class NotFound(DomainException):
    status_code = status.HTTP_404_NOT_FOUND
    default_code = "not_found"
    default_message = "Resource not found."
