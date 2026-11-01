"""Audit log model — append-only event trail."""

import uuid

from django.conf import settings
from django.db import models


class AuditAction(models.TextChoices):
    USER_ROLE_CHANGED = "USER_ROLE_CHANGED", "User Role Changed"
    USER_DEACTIVATED = "USER_DEACTIVATED", "User Deactivated"
    MANAGER_CHANGED = "MANAGER_CHANGED", "Manager Changed"
    EMPLOYEE_CREATED = "EMPLOYEE_CREATED", "Employee Created"
    EMPLOYEE_IMPORTED = "EMPLOYEE_IMPORTED", "Employee Imported"
    REVIEW_TRANSITION = "REVIEW_TRANSITION", "Review Transition"
    RATING_CHANGED = "RATING_CHANGED", "Rating Changed"
    CALIBRATION_PROPOSED = "CALIBRATION_PROPOSED", "Calibration Proposed"
    GOAL_APPROVED = "GOAL_APPROVED", "Goal Approved"
    GOAL_REJECTED = "GOAL_REJECTED", "Goal Rejected"
    SKILL_VALIDATED = "SKILL_VALIDATED", "Skill Validated"
    SKILL_REJECTED = "SKILL_REJECTED", "Skill Rejected"
    PLAN_APPROVED = "PLAN_APPROVED", "Plan Approved"
    PROMOTION_FLAGGED = "PROMOTION_FLAGGED", "Promotion Flagged"
    DATA_EXPORTED = "DATA_EXPORTED", "Data Exported"
    CONFIDENTIAL_FEEDBACK_VIEWED = "CONFIDENTIAL_FEEDBACK_VIEWED", "Confidential Feedback Viewed"
    ORG_SETTINGS_CHANGED = "ORG_SETTINGS_CHANGED", "Org Settings Changed"
    ROLE_REQUIREMENTS_CHANGED = "ROLE_REQUIREMENTS_CHANGED", "Role Requirements Changed"
    AI_USED = "AI_USED", "AI Used"


class AuditLog(models.Model):
    """
    Append-only audit log.
    Never updated or deleted. Stores field-level diffs for sensitive actions.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name="audit_actions",
    )
    action = models.CharField(max_length=60, choices=AuditAction.choices, db_index=True)

    entity_type = models.CharField(max_length=100, db_index=True)
    entity_id = models.CharField(max_length=100, db_index=True)
    entity_label = models.CharField(max_length=255, blank=True)

    summary = models.TextField(blank=True)
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)
    changes = models.JSONField(null=True, blank=True)  # [{field, before, after}]

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = "audit_auditlog"
        ordering = ["-created_at"]
        # Prevent accidental writes to finished logs
        # delete permission not granted in admin

    def __str__(self) -> str:
        return f"[{self.action}] {self.entity_type}/{self.entity_id} by {self.actor}"
