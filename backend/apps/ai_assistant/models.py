from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class AIRequestLog(BaseModel):
    """Audit record for external AI API calls."""

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="ai_requests"
    )
    feature = models.CharField(max_length=50)  # e.g., 'review_draft', 'skill_gap_summary'
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    latency_ms = models.PositiveIntegerField(default=0)
    success = models.BooleanField(default=True)
    error = models.TextField(blank=True)

    class Meta:
        db_table = "ai_airequestlog"
        ordering = ["-created_at"]
