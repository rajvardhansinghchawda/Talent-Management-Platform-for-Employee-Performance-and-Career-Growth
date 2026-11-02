from rest_framework.permissions import BasePermission

from apps.accounts.constants import Role


class HasRole(BasePermission):
    """
    Permission class that accepts a list of allowed roles.
    Usage: permission_classes = [HasRole(Role.HR_ADMIN, Role.MANAGER)]
    """

    def __init__(self, *allowed_roles: str):
        self.allowed_roles = allowed_roles

    def __call__(self):
        return self
    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in self.allowed_roles
        )

    @classmethod
    def hr_admin(cls) -> "HasRole":
        return cls(Role.HR_ADMIN)

    @classmethod
    def manager(cls) -> "HasRole":
        return cls(Role.MANAGER, Role.HR_ADMIN)

    @classmethod
    def employee_or_above(cls) -> "HasRole":
        return cls(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.EXECUTIVE)

    @classmethod
    def executive(cls) -> "HasRole":
        return cls(Role.EXECUTIVE, Role.HR_ADMIN)


class IsSelf(BasePermission):
    """Object-level permission: only allows access to own employee record."""

    def has_object_permission(self, request, view, obj) -> bool:
        if hasattr(obj, "user"):
            return obj.user == request.user
        return obj == request.user
