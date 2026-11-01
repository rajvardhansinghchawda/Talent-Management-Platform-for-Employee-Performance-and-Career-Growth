"""Notification service — create in-app notifications and dispatch emails."""

from __future__ import annotations

from .models import Notification, NotificationPreference


def notify(
    user,
    category: str,
    title: str,
    body: str = "",
    link: str = "",
) -> Notification | None:
    """
    Create an in-app notification for a user, respecting their preferences.
    Returns the created Notification or None if suppressed.

    Email dispatch is handled via Celery — see tasks.py.
    """
    # Check in-app preference (default: enabled)
    try:
        pref = NotificationPreference.objects.get(user=user, category=category)
        if not pref.in_app_enabled:
            return None
    except NotificationPreference.DoesNotExist:
        pass  # No preference = use default (enabled)

    # Validate link is a relative frontend route (no external URLs)
    if link and not link.startswith("/"):
        link = ""

    notification = Notification.objects.create(
        recipient=user,
        category=category,
        title=title,
        body=body,
        link=link,
    )

    # Dispatch email task if email preference allows it
    _maybe_dispatch_email(user, notification)

    return notification


def _maybe_dispatch_email(user, notification: Notification) -> None:
    """Dispatch email notification via Celery if email preference allows it."""
    try:
        pref = NotificationPreference.objects.get(user=user, category=notification.category)
        if not pref.email_enabled:
            return
    except NotificationPreference.DoesNotExist:
        pass  # Default: send email

    from django.db import transaction

    from .tasks import send_email_notification

    transaction.on_commit(lambda: send_email_notification.delay(str(notification.id)))
