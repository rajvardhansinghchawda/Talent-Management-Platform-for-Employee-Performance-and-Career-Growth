"""Core views — 404 handler and system endpoints."""

from django.http import JsonResponse


def custom_404_handler(request, exception=None):
    return JsonResponse(
        {"error": {"code": "not_found", "message": "The requested resource was not found."}},
        status=404,
    )
