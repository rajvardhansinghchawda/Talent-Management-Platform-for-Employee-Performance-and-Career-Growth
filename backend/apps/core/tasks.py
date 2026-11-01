"""Core Celery tasks — health ping task for verifying worker connectivity."""

from celery import shared_task


@shared_task(name="core.ping")
def ping() -> str:
    """Simple ping task to verify Celery worker is alive."""
    return "pong"
