"""Career models: DevelopmentPlan, DevelopmentPlanItem, ReadinessSnapshot, PromotionReviewFlag."""

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class DevelopmentPlanStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    PENDING_APPROVAL = "PENDING_APPROVAL", "Pending Approval"
    ACTIVE = "ACTIVE", "Active"
    COMPLETED = "COMPLETED", "Completed"


class DevelopmentPlan(BaseModel):
    """A career development plan for an employee targeting a specific role."""

    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="development_plans"
    )
    target_role = models.ForeignKey(
        "skills.JobRole", null=True, blank=True, on_delete=models.SET_NULL
    )
    start_date = models.DateField(null=True, blank=True)
    target_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=DevelopmentPlanStatus.choices, default=DevelopmentPlanStatus.DRAFT
    )

    class Meta:
        db_table = "careers_developmentplan"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Dev plan: {self.employee} → {self.target_role}"

    @property
    def progress_pct(self) -> int:
        items = self.items.exclude(status__in=["REJECTED"])
        total = items.count()
        if not total:
            return 0
        done = items.filter(status="DONE").count()
        return int(done / total * 100)


class DevelopmentPlanItemStatus(models.TextChoices):
    PROPOSED = "PROPOSED", "Proposed"
    PLANNED = "PLANNED", "Planned"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    DONE = "DONE", "Done"
    REJECTED = "REJECTED", "Rejected"


class DevelopmentPlanItem(BaseModel):
    """An individual item/action in a development plan."""

    class ItemType(models.TextChoices):
        COURSE = "COURSE", "Course"
        PROJECT = "PROJECT", "Project"
        MENTORING = "MENTORING", "Mentoring"
        CERTIFICATION = "CERTIFICATION", "Certification"
        OTHER = "OTHER", "Other"

    plan = models.ForeignKey(DevelopmentPlan, on_delete=models.CASCADE, related_name="items")
    item_type = models.CharField(max_length=20, choices=ItemType.choices)
    skill = models.ForeignKey(
        "skills.Skill", null=True, blank=True, on_delete=models.SET_NULL, related_name="plan_items"
    )
    course = models.ForeignKey(
        "learning.Course",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="plan_items",
    )
    title = models.CharField(max_length=500)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=DevelopmentPlanItemStatus.choices,
        default=DevelopmentPlanItemStatus.PROPOSED,
    )
    rationale = models.TextField(blank=True)
    progress_note = models.TextField(blank=True)
    proposed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        db_table = "careers_developmentplanitem"
        ordering = ["due_date", "created_at"]

    def __str__(self) -> str:
        return f"{self.plan.employee} — {self.title}"


class ReadinessStatus(models.TextChoices):
    DEVELOPING = "DEVELOPING", "Developing"
    NEAR_READY = "NEAR_READY", "Near Ready"
    READY_FOR_REVIEW = "READY_FOR_REVIEW", "Ready for Review"


class ReadinessSnapshot(BaseModel):
    """
    A point-in-time snapshot of an employee's readiness for their target role.
    Computed by the readiness engine and stored for dashboards and nine-box.
    """

    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="readiness_snapshots"
    )
    target_role = models.ForeignKey(
        "skills.JobRole", null=True, blank=True, on_delete=models.SET_NULL
    )
    status = models.CharField(
        max_length=20, choices=ReadinessStatus.choices, default=ReadinessStatus.DEVELOPING
    )
    coverage = models.DecimalField(max_digits=5, decimal_places=4, default=0)
    criteria = models.JSONField(default=list)  # [{key, name, passed, detail}]
    advisory_text = models.TextField(blank=True)
    snapshotted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "careers_readinesssnapshot"
        ordering = ["-snapshotted_at"]

    def __str__(self) -> str:
        return f"{self.employee} — {self.status} for {self.target_role}"


class PromotionReviewFlag(BaseModel):
    """
    A flag raised by a manager indicating an employee may be ready for promotion review.
    Notifies HR. Never auto-promotes or changes roles/compensation.
    """

    class FlagStatus(models.TextChoices):
        OPEN = "OPEN", "Open"
        ACKNOWLEDGED = "ACKNOWLEDGED", "Acknowledged"
        CLOSED = "CLOSED", "Closed"

    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="promotion_flags"
    )
    target_role = models.ForeignKey(
        "skills.JobRole", null=True, blank=True, on_delete=models.SET_NULL
    )
    flagged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="promotion_flags_raised"
    )
    note = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=FlagStatus.choices, default=FlagStatus.OPEN)
    readiness_snapshot = models.JSONField(null=True, blank=True)  # Snapshot at time of flagging

    class Meta:
        db_table = "careers_promotionreviewflag"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Flag: {self.employee} → {self.target_role} by {self.flagged_by}"
