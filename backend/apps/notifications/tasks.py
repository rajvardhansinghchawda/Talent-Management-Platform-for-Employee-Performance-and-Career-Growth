"""Notification Celery tasks — email dispatch."""

from __future__ import annotations

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


@shared_task(
    name="notifications.send_email_notification",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue="notifications",
)
def send_email_notification(self, notification_id: str) -> None:
    """Send an email for a notification if email_enabled for the recipient's preference."""
    from .models import Notification

    try:
        notification = Notification.objects.select_related("recipient").get(id=notification_id)
    except Notification.DoesNotExist:
        return  # Already cleaned up or invalid

    user = notification.recipient
    try:
        send_mail(
            subject=f"[Talent Platform] {notification.title}",
            message=notification.body or notification.title,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(
    name="notifications.send_password_reset_email",
    bind=True,
    max_retries=3,
    queue="notifications",
)
def send_password_reset_email(self, user_id: str, reset_link: str) -> None:
    """Send a password reset email to the user."""
    from apps.accounts.models import User

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return

    try:
        send_mail(
            subject="Reset your Talent Platform password",
            message=f"Click the link below to reset your password:\n\n{reset_link}\n\nThis link expires in 1 hour.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(
    name="notifications.send_invite_email",
    bind=True,
    max_retries=3,
    queue="notifications",
)
def send_invite_email(self, user_id: str, invite_link: str) -> None:
    """Send an onboarding invite email."""
    from apps.accounts.models import User

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return

    try:
        send_mail(
            subject="Welcome to the Talent Platform — Set your password",
            message=f"You have been invited to the Talent Management Platform.\n\nSet your password here:\n{invite_link}\n\nThis link expires in 72 hours.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as exc:
        raise self.retry(exc=exc)
