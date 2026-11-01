"""Notification and NotificationPreference models."""

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class NotificationCategory(models.TextChoices):
    CYCLE_STARTED = "CYCLE_STARTED", "Cycle Started"
    REVIEW_DUE = "REVIEW_DUE", "Review Due"
    REVIEW_OVERDUE = "REVIEW_OVERDUE", "Review Overdue"
    REVIEW_COMPLETED = "REVIEW_COMPLETED", "Review Completed"
    GOAL_APPROVAL_NEEDED = "GOAL_APPROVAL_NEEDED", "Goal Approval Needed"
    GOAL_DECISION = "GOAL_DECISION", "Goal Decision"
    SKILL_VALIDATION_NEEDED = "SKILL_VALIDATION_NEEDED", "Skill Validation Needed"
    SKILL_VALIDATED = "SKILL_VALIDATED", "Skill Validated"
    FEEDBACK_RECEIVED = "FEEDBACK_RECEIVED", "Feedback Received"
    FEEDBACK_REQUESTED = "FEEDBACK_REQUESTED", "Feedback Requested"
    RECOGNITION_RECEIVED = "RECOGNITION_RECEIVED", "Recognition Received"
    COURSE_ASSIGNED = "COURSE_ASSIGNED", "Course Assigned"
    COURSE_COMPLETED = "COURSE_COMPLETED", "Course Completed"
    PLAN_PENDING_APPROVAL = "PLAN_PENDING_APPROVAL", "Plan Pending Approval"
    PLAN_DECISION = "PLAN_DECISION", "Plan Decision"
    ONE_ON_ONE_SCHEDULED = "ONE_ON_ONE_SCHEDULED", "1:1 Scheduled"
    PROMOTION_REVIEW_FLAGGED = "PROMOTION_REVIEW_FLAGGED", "Promotion Review Flagged"
    REPORT_READY = "REPORT_READY", "Report Ready"
    IMPORT_FINISHED = "IMPORT_FINISHED", "Import Finished"


class Notification(BaseModel):
    """In-app notification for a user."""

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    category = models.CharField(max_length=50, choices=NotificationCategory.choices)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    link = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notifications_notification"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"[{self.category}] {self.title} → {self.recipient.email}"


class NotificationPreference(BaseModel):
    """Per-user notification preferences per category."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preferences",
    )
    category = models.CharField(max_length=50, choices=NotificationCategory.choices)
    email_enabled = models.BooleanField(default=True)
    in_app_enabled = models.BooleanField(default=True)

    class Meta:
        db_table = "notifications_preference"
        unique_together = [("user", "category")]

    def __str__(self) -> str:
        return f"{self.user.email} — {self.category}"
