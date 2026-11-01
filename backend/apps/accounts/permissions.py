from rest_framework.permissions import IsAuthenticated


class IsPasswordChangeRequired(IsAuthenticated):
    """
    Blocks all endpoints when must_change_password is True,
    except the allowed bypass endpoints.
    """

    message = {
        "code": "permission_denied",
        "message": "You must change your password before continuing.",
        "details": {"code": "password_change_required"},
    }

    def has_permission(self, request, view) -> bool:
        if not super().has_permission(request, view):
            return False
        if request.user.must_change_password:
            bypass_views = {"auth-me", "auth-logout", "password-change"}
            if hasattr(view, "basename") and view.basename in bypass_views:
                return True
            return False
        return True
