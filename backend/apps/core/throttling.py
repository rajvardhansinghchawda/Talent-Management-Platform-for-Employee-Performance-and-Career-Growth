"""Custom throttling classes for authentication and sensitive endpoints."""

from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    """Throttle for POST /auth/login/ based on client IP."""

    scope = "login"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class PasswordResetRateThrottle(SimpleRateThrottle):
    """Throttle for POST /auth/password/reset/ based on client IP."""

    scope = "password_reset"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}
