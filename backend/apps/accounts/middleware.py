"""Middleware for enforcing mandatory password change."""

from django.http import JsonResponse
from django.urls import resolve


class MustChangePasswordMiddleware:
    """
    If an authenticated user has must_change_password=True,
    block access to all API endpoints except allowed authentication endpoints.
    """

    ALLOWED_URL_NAMES = {
        "auth-me",
        "auth-logout",
        "password-change",
        "healthz",
        "readyz",
        "schema",
        "swagger-ui",
        "redoc",
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if getattr(request, "user", None) and request.user.is_authenticated:
            if getattr(request.user, "must_change_password", False):
                try:
                    match = resolve(request.path_info)
                    url_name = match.url_name
                except Exception:
                    url_name = None

                if url_name not in self.ALLOWED_URL_NAMES and request.path_info.startswith("/api/"):
                    return JsonResponse(
                        {
                            "error": {
                                "code": "permission_denied",
                                "message": "Password change required before accessing other resources.",
                                "details": {"code": "password_change_required"},
                            }
                        },
                        status=403,
                    )

        return self.get_response(request)
