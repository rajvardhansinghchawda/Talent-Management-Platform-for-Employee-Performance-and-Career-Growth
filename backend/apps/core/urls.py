from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.urls import path


def healthz(request):
    """Liveness check — returns 200 immediately."""
    return JsonResponse({"status": "ok"})


def readyz(request):
    """Readiness check — verifies database and Redis connectivity."""
    errors = {}

    # Check database
    try:
        connection.ensure_connection()
    except Exception as e:
        errors["database"] = str(e)

    # Check Redis (cache)
    try:
        cache.set("readyz_ping", "pong", timeout=5)
        if cache.get("readyz_ping") != "pong":
            errors["redis"] = "Cache round-trip failed"
    except Exception as e:
        errors["redis"] = str(e)

    if errors:
        return JsonResponse({"status": "error", "errors": errors}, status=503)
    return JsonResponse({"status": "ok", "database": "ok", "redis": "ok"})


urlpatterns = [
    path("healthz", healthz, name="healthz"),
    path("readyz", readyz, name="readyz"),
]
