"""Account domain services: authentication, password management, session control."""

from __future__ import annotations

import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.exceptions import DomainException

from .models import User


def authenticate_user(email: str, password: str) -> User:
    """
    Authenticate a user by email and password.
    Enforces account lockout and tracks failed attempts.
    """
    try:
        user = User.objects.get(email=email.lower())
    except User.DoesNotExist:
        raise DomainException(
            message="Invalid credentials.", details={"code": "authentication_failed"}
        )

    if not user.is_active:
        raise DomainException(
            message="Account is inactive.", details={"code": "authentication_failed"}
        )

    if user.is_locked:
        raise DomainException(
            message="Account is temporarily locked.",
            details={"code": "account_locked", "locked_until": user.locked_until.isoformat()},
        )

    if not user.check_password(password):
        user.failed_login_attempts += 1
        max_attempts = getattr(settings, "LOGIN_MAX_ATTEMPTS", 5)
        lockout_minutes = getattr(settings, "LOGIN_LOCKOUT_MINUTES", 15)
        if user.failed_login_attempts >= max_attempts:
            user.locked_until = timezone.now() + timedelta(minutes=lockout_minutes)
        user.save(update_fields=["failed_login_attempts", "locked_until"])
        raise DomainException(
            message="Invalid credentials.", details={"code": "authentication_failed"}
        )

    # Reset on success
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = timezone.now()
    user.save(update_fields=["failed_login_attempts", "locked_until", "last_login_at"])

    return user


def generate_tokens(user: User) -> tuple[str, str]:
    """Generate JWT access and refresh token pair for a user."""
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token), str(refresh)


def create_password_reset_token(email: str) -> str | None:
    """
    Creates a password reset token for the user with the given email.
    Returns None silently if the email doesn't exist (to prevent enumeration).
    """
    try:
        user = User.objects.get(email=email.lower(), is_active=True)
    except User.DoesNotExist:
        return None

    token = secrets.token_urlsafe(48)
    user.invite_token = token  # Reusing invite_token field for password reset
    user.invite_expires_at = timezone.now() + timedelta(hours=1)
    user.save(update_fields=["invite_token", "invite_expires_at"])
    return token


def validate_password_reset_token(token: str) -> User:
    """Validate a password reset token and return the user."""
    try:
        user = User.objects.get(invite_token=token, is_active=True)
    except User.DoesNotExist:
        raise DomainException(
            message="Invalid or expired token.", details={"code": "invalid_token"}
        )

    if not user.invite_expires_at or user.invite_expires_at < timezone.now():
        raise DomainException(message="Token has expired.", details={"code": "invalid_token"})

    return user


def reset_password(token: str, new_password: str) -> User:
    """Reset a user's password using a valid reset token."""
    user = validate_password_reset_token(token)
    _validate_password_policy(new_password)
    user.set_password(new_password)
    user.invite_token = None
    user.invite_expires_at = None
    user.must_change_password = False
    user.save(
        update_fields=["password", "invite_token", "invite_expires_at", "must_change_password"]
    )
    return user


def change_password(user: User, current_password: str, new_password: str) -> None:
    """Change a user's password after verifying their current password."""
    if not user.check_password(current_password):
        raise DomainException(
            message="Current password is incorrect.", details={"code": "invalid_password"}
        )
    _validate_password_policy(new_password)
    user.set_password(new_password)
    user.must_change_password = False
    user.save(update_fields=["password", "must_change_password"])


def _validate_password_policy(password: str) -> None:
    """Enforce password policy rules."""
    errors = []
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long.")
    if not any(c.isupper() for c in password):
        errors.append("Password must contain at least one uppercase letter.")
    if not any(c.isdigit() for c in password):
        errors.append("Password must contain at least one digit.")
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        errors.append("Password must contain at least one special character.")
    if errors:
        raise DomainException(
            message="Password does not meet policy requirements.", details={"password": errors}
        )


def get_password_policy() -> dict:
    """Return password policy rules as structured data for UI hints."""
    return {
        "min_length": 8,
        "require_uppercase": True,
        "require_digit": True,
        "require_special": True,
        "rules": [
            "At least 8 characters",
            "At least one uppercase letter (A\u2013Z)",
            "At least one digit (0\u20139)",
            "At least one special character (!@#$%^&*...)",
        ],
    }
