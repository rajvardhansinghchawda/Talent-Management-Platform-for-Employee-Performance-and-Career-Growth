import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("talent_platform")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.task_queues = {
    "default": {"exchange": "default", "routing_key": "default"},
    "notifications": {"exchange": "notifications", "routing_key": "notifications"},
    "reports": {"exchange": "reports", "routing_key": "reports"},
    "ai": {"exchange": "ai", "routing_key": "ai"},
}
app.conf.task_default_queue = "default"
app.conf.task_default_exchange = "default"
app.conf.task_default_routing_key = "default"
