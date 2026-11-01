"""Skills, JobRole, RoleSkill, CareerPathStep, SkillAssessment models."""

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class Skill(BaseModel):
    """A skill or competency that can be assessed, required by roles, and mapped to courses."""

    name = models.CharField(max_length=255, unique=True)
    category = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "skills_skill"
        ordering = ["category", "name"]

    def __str__(self) -> str:
        return self.name

    @property
    def usage_count(self) -> int:
        """Approx count of employees who have this skill assessed."""
        return self.assessments.filter(status="VALIDATED").count()


class JobRole(BaseModel):
    """A job role / position in the organization."""

    title = models.CharField(max_length=255)
    track = models.CharField(max_length=100, blank=True)
    level = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    department = models.ForeignKey(
        "organizations.Department",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="job_roles",
    )
    min_months_in_role = models.PositiveSmallIntegerField(default=0)
    is_critical = models.BooleanField(default=False)

    class Meta:
        db_table = "skills_jobrole"
        ordering = ["track", "level", "title"]

    def __str__(self) -> str:
        return self.title


class RoleSkill(BaseModel):
    """A required skill for a job role, with required level and weight."""

    role = models.ForeignKey(JobRole, on_delete=models.CASCADE, related_name="role_skills")
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name="role_requirements")
    required_level = models.PositiveSmallIntegerField()  # 1–5
    weight = models.PositiveSmallIntegerField(default=3)  # 1–5
    is_must_have = models.BooleanField(default=False)

    class Meta:
        db_table = "skills_roleskill"
        unique_together = [("role", "skill")]

    def __str__(self) -> str:
        return f"{self.role} — {self.skill} (lvl {self.required_level})"


class CareerPathStep(BaseModel):
    """Defines a valid transition from one job role to another in the career path graph."""

    from_role = models.ForeignKey(JobRole, on_delete=models.CASCADE, related_name="next_steps")
    to_role = models.ForeignKey(JobRole, on_delete=models.CASCADE, related_name="previous_steps")

    class Meta:
        db_table = "skills_careerpathstep"
        unique_together = [("from_role", "to_role")]

    def __str__(self) -> str:
        return f"{self.from_role} → {self.to_role}"


class SkillAssessmentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    VALIDATED = "VALIDATED", "Validated"
    REJECTED = "REJECTED", "Rejected"


class SkillAssessmentSource(models.TextChoices):
    SELF = "SELF", "Self-Assessment"
    MANAGER = "MANAGER", "Manager Validation"
    CERTIFICATION = "CERTIFICATION", "Course Certification"
    IMPORT = "IMPORT", "Import"


class SkillAssessment(BaseModel):
    """
    An append-only skill level assessment record.
    Assessments are never updated — a new record is created for each change.
    """

    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="skill_assessments"
    )
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name="assessments")
    level = models.PositiveSmallIntegerField()  # 1–5
    source = models.CharField(max_length=20, choices=SkillAssessmentSource.choices)
    status = models.CharField(
        max_length=20, choices=SkillAssessmentStatus.choices, default=SkillAssessmentStatus.PENDING
    )

    evidence_note = models.TextField(blank=True)
    evidence_url = models.URLField(blank=True)

    assessed_on = models.DateField(auto_now_add=True)
    validated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="validated_assessments",
    )
    validated_on = models.DateField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    class Meta:
        db_table = "skills_skillassessment"
        ordering = ["-assessed_on", "-created_at"]
        # Append-only: no unique_together — we keep all historical records

    def __str__(self) -> str:
        return f"{self.employee} — {self.skill} lvl {self.level} ({self.source}/{self.status})"
