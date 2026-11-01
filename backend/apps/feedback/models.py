"""Feedback models: Feedback, FeedbackRequest, Badge, Recognition, OneOnOne, ActionItem."""

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class FeedbackType(models.TextChoices):
    GENERAL = "GENERAL", "General"
    STRENGTHS = "STRENGTHS", "Strengths"
    AREAS_FOR_GROWTH = "AREAS_FOR_GROWTH", "Areas for Growth"
    PEER = "PEER", "Peer"
    UPWARD = "UPWARD", "Upward"


class FeedbackVisibility(models.TextChoices):
    EMPLOYEE_VISIBLE = "EMPLOYEE_VISIBLE", "Employee Visible"
    MANAGER_AND_EMPLOYEE = "MANAGER_AND_EMPLOYEE", "Manager and Employee"
    PRIVATE_TO_MANAGER = "PRIVATE_TO_MANAGER", "Private to Manager"


class Feedback(BaseModel):
    """Feedback given to an employee by another user."""

    to_employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="received_feedback"
    )
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="given_feedback",
    )
    feedback_type = models.CharField(
        max_length=25, choices=FeedbackType.choices, default=FeedbackType.GENERAL
    )
    content = models.TextField()
    visibility = models.CharField(
        max_length=30,
        choices=FeedbackVisibility.choices,
        default=FeedbackVisibility.EMPLOYEE_VISIBLE,
    )
    is_anonymous = models.BooleanField(default=False)
    fulfills_request = models.ForeignKey(
        "FeedbackRequest",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="fulfilled_feedbacks",
    )

    class Meta:
        db_table = "feedback_feedback"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Feedback to {self.to_employee} [{self.feedback_type}]"


class FeedbackRequest(BaseModel):
    """A request from an employee to receive feedback from a colleague."""

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        FULFILLED = "FULFILLED", "Fulfilled"
        DECLINED = "DECLINED", "Declined"

    requester = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="feedback_requests_sent"
    )
    requested_from = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feedback_requests_received",
    )
    message = models.TextField(blank=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)

    class Meta:
        db_table = "feedback_feedbackrequest"
        ordering = ["-created_at"]


class Badge(BaseModel):
    """A recognition badge that can be awarded to employees."""

    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=100, blank=True)  # emoji or icon name
    description = models.TextField(blank=True)

    class Meta:
        db_table = "feedback_badge"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Recognition(BaseModel):
    """A peer recognition (badge given from one employee to another)."""

    class Visibility(models.TextChoices):
        PUBLIC = "PUBLIC_RECOGNITION", "Public"
        PRIVATE = "PRIVATE", "Private"

    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name="given")
    from_employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="recognitions_given"
    )
    to_employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="recognitions_received"
    )
    message = models.TextField(blank=True)
    visibility = models.CharField(
        max_length=25, choices=Visibility.choices, default=Visibility.PUBLIC
    )

    class Meta:
        db_table = "feedback_recognition"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.badge} from {self.from_employee} to {self.to_employee}"


class OneOnOne(BaseModel):
    """A 1:1 meeting between a manager and an employee."""

    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    class RecurrenceFrequency(models.TextChoices):
        WEEKLY = "WEEKLY", "Weekly"
        BIWEEKLY = "BIWEEKLY", "Biweekly"
        MONTHLY = "MONTHLY", "Monthly"

    manager = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="one_on_ones_as_manager"
    )
    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="one_on_ones_as_employee"
    )
    scheduled_at = models.DateTimeField()
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.SCHEDULED)
    shared_notes = models.TextField(blank=True)
    private_notes = models.TextField(blank=True)  # NEVER serialized for the employee

    # Recurrence
    series_id = models.UUIDField(null=True, blank=True, db_index=True)
    recurrence = models.JSONField(null=True, blank=True)  # {frequency, until}

    class Meta:
        db_table = "feedback_oneonone"
        ordering = ["scheduled_at"]

    def __str__(self) -> str:
        return f"1:1 {self.manager} ↔ {self.employee} at {self.scheduled_at}"


class ActionItem(BaseModel):
    """An action item from a 1:1 meeting."""

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        DONE = "DONE", "Done"

    one_on_one = models.ForeignKey(OneOnOne, on_delete=models.CASCADE, related_name="action_items")
    title = models.CharField(max_length=500)
    owner = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="action_items"
    )
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)

    class Meta:
        db_table = "feedback_actionitem"
        ordering = ["due_date", "created_at"]

    def __str__(self) -> str:
        return f"[{self.status}] {self.title}"
