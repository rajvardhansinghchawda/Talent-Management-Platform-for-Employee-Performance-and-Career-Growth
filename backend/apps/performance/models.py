"""Performance models: ReviewCycle, Goal, GoalUpdate, GoalComment, PerformanceReview, Calibration."""

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel

# ─── Review Cycle ────────────────────────────────────────────────────────────


class CycleStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    ACTIVE = "ACTIVE", "Active"
    CALIBRATION = "CALIBRATION", "Calibration"
    CLOSED = "CLOSED", "Closed"


class CycleType(models.TextChoices):
    ANNUAL = "ANNUAL", "Annual"
    MID_YEAR = "MID_YEAR", "Mid-Year"
    QUARTERLY = "QUARTERLY", "Quarterly"
    PROJECT = "PROJECT", "Project"


class ReviewCycle(BaseModel):
    """A performance review cycle (annual, mid-year, etc.)."""

    name = models.CharField(max_length=255)
    cycle_type = models.CharField(
        max_length=20, choices=CycleType.choices, default=CycleType.ANNUAL
    )
    status = models.CharField(max_length=20, choices=CycleStatus.choices, default=CycleStatus.DRAFT)

    start_date = models.DateField()
    end_date = models.DateField()
    self_assessment_due = models.DateField(null=True, blank=True)
    manager_review_due = models.DateField(null=True, blank=True)

    departments = models.ManyToManyField(
        "organizations.Department", blank=True, related_name="review_cycles"
    )
    rating_scale_snapshot = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "performance_reviewcycle"
        ordering = ["-start_date"]

    def __str__(self) -> str:
        return f"{self.name} ({self.status})"


# ─── Goals ───────────────────────────────────────────────────────────────────


class GoalStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    PENDING_APPROVAL = "PENDING_APPROVAL", "Pending Approval"
    ACTIVE = "ACTIVE", "Active"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"
    REJECTED = "REJECTED", "Rejected"


class GoalType(models.TextChoices):
    KPI = "KPI", "KPI"
    OKR = "OKR", "OKR"
    DEVELOPMENTAL = "DEVELOPMENTAL", "Developmental"
    COMPANY = "COMPANY", "Company"


class GoalDirection(models.TextChoices):
    HIGHER_BETTER = "HIGHER_BETTER", "Higher is Better"
    LOWER_BETTER = "LOWER_BETTER", "Lower is Better"


class Goal(BaseModel):
    """A goal assigned to an employee in a review cycle."""

    owner = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="goals")
    cycle = models.ForeignKey(
        ReviewCycle, null=True, blank=True, on_delete=models.SET_NULL, related_name="goals"
    )
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="children"
    )

    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    goal_type = models.CharField(max_length=20, choices=GoalType.choices, default=GoalType.KPI)

    metric_unit = models.CharField(max_length=50, blank=True)
    start_value = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    target_value = models.DecimalField(max_digits=15, decimal_places=4, default=100)
    current_value = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    direction = models.CharField(
        max_length=20, choices=GoalDirection.choices, default=GoalDirection.HIGHER_BETTER
    )

    weight = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=25, choices=GoalStatus.choices, default=GoalStatus.DRAFT)

    completed_at = models.DateTimeField(null=True, blank=True)
    completion_note = models.TextField(blank=True)

    class Meta:
        db_table = "performance_goal"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.owner} — {self.title}"

    @property
    def is_overdue(self) -> bool:
        from django.utils import timezone

        if self.due_date and self.status not in (GoalStatus.COMPLETED, GoalStatus.CANCELLED):
            return self.due_date < timezone.now().date()
        return False


class GoalUpdate(BaseModel):
    """A progress update on a goal (append-only, one data point per update)."""

    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name="updates")
    author = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="goal_updates"
    )
    value = models.DecimalField(max_digits=15, decimal_places=4)
    note = models.TextField(blank=True)
    evidence_url = models.URLField(blank=True)

    class Meta:
        db_table = "performance_goalupdate"
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.goal} update → {self.value}"


class GoalComment(BaseModel):
    """A manager comment on a goal (approval, rejection, or general note)."""

    class Kind(models.TextChoices):
        APPROVAL = "APPROVAL", "Approval"
        REJECTION = "REJECTION", "Rejection"
        NOTE = "NOTE", "Note"

    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    kind = models.CharField(max_length=15, choices=Kind.choices)
    text = models.TextField()

    class Meta:
        db_table = "performance_goalcomment"
        ordering = ["created_at"]


# ─── Performance Review ────────────────────────────────────────────────────────


class ReviewStatus(models.TextChoices):
    NOT_STARTED = "NOT_STARTED", "Not Started"
    SELF_ASSESSMENT = "SELF_ASSESSMENT", "Self Assessment"
    MANAGER_REVIEW = "MANAGER_REVIEW", "Manager Review"
    CALIBRATION = "CALIBRATION", "Calibration"
    COMPLETED = "COMPLETED", "Completed"
    ACKNOWLEDGED = "ACKNOWLEDGED", "Acknowledged"
    DISPUTED = "DISPUTED", "Disputed"


class PerformanceReview(BaseModel):
    """One performance review for one employee in one review cycle."""

    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="reviews"
    )
    cycle = models.ForeignKey(ReviewCycle, on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey(
        "employees.Employee",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviews_to_complete",
    )

    status = models.CharField(
        max_length=20, choices=ReviewStatus.choices, default=ReviewStatus.NOT_STARTED
    )

    # Self-assessment fields
    self_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    self_comments = models.TextField(blank=True)
    self_assessment_draft = models.JSONField(null=True, blank=True)
    self_assessment_submitted_at = models.DateTimeField(null=True, blank=True)

    # Manager review fields (hidden from employee until COMPLETED)
    manager_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    manager_comments = models.TextField(blank=True)
    manager_draft = models.JSONField(null=True, blank=True)
    manager_review_submitted_at = models.DateTimeField(null=True, blank=True)

    # Calibration fields
    proposed_calibrated_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    calibration_comment = models.TextField(blank=True)
    calibrated_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    final_rating = models.PositiveSmallIntegerField(null=True, blank=True)

    # Snapshot at time of manager review submission
    goal_score_snapshot = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)

    # Development recommendations (returned to employee post-completion)
    development_recommendations = models.JSONField(default=list, blank=True)

    # Outcome
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    dispute_reason = models.TextField(blank=True)
    disputed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "performance_performancereview"
        unique_together = [("employee", "cycle")]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Review: {self.employee} — {self.cycle}"


class ReviewCalibrationEntry(BaseModel):
    """Append-only record of each calibration change on a review."""

    review = models.ForeignKey(
        PerformanceReview, on_delete=models.CASCADE, related_name="calibration_history"
    )
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    from_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    to_rating = models.PositiveSmallIntegerField()
    comment = models.TextField()

    class Meta:
        db_table = "performance_calibrationentry"
        ordering = ["created_at"]
