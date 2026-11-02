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
        user = getattr(request, "user", None)
        if not (user and getattr(user, "is_authenticated", False)):
            # DRF client.force_authenticate sets _force_auth_user on request
            user = getattr(request, "_force_auth_user", None)
        if not (user and getattr(user, "is_authenticated", False)):
            # Check JWT header if present on request
            try:
                from rest_framework_simplejwt.authentication import JWTAuthentication

                auth_result = JWTAuthentication().authenticate(request)
                if auth_result:
                    user = auth_result[0]
            except Exception:
                pass

        if user and getattr(user, "is_authenticated", False):
            if getattr(user, "must_change_password", False):
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
