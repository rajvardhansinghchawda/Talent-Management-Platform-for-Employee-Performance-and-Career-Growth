"""Learning models: Course, CourseSkill, Enrollment."""

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class CourseDifficulty(models.TextChoices):
    BEGINNER = "BEGINNER", "Beginner"
    INTERMEDIATE = "INTERMEDIATE", "Intermediate"
    ADVANCED = "ADVANCED", "Advanced"


class CourseFormat(models.TextChoices):
    ONLINE = "ONLINE", "Online"
    IN_PERSON = "IN_PERSON", "In Person"
    BLENDED = "BLENDED", "Blended"
    SELF_PACED = "SELF_PACED", "Self-Paced"


class Course(BaseModel):
    """A learning course that can be enrolled in and maps to skills."""

    title = models.CharField(max_length=500)
    provider = models.CharField(max_length=255)
    provider_url = models.URLField(blank=True)
    description = models.TextField(blank=True)
    overview = models.TextField(blank=True)
    difficulty = models.CharField(
        max_length=20, choices=CourseDifficulty.choices, default=CourseDifficulty.INTERMEDIATE
    )
    format = models.CharField(
        max_length=20, choices=CourseFormat.choices, default=CourseFormat.ONLINE
    )
    duration_hours = models.DecimalField(max_digits=6, decimal_places=1, default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "learning_course"
        ordering = ["title"]

    def __str__(self) -> str:
        return self.title

    @property
    def enrollment_count(self) -> int:
        return self.enrollments.count()

    @property
    def completion_rate(self) -> float:
        total = self.enrollments.count()
        if not total:
            return 0.0
        completed = self.enrollments.filter(status="COMPLETED").count()
        return round(completed / total, 4)


class CourseSkill(BaseModel):
    """Maps a course to a skill with before/after proficiency levels."""

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="skill_mappings")
    skill = models.ForeignKey(
        "skills.Skill", on_delete=models.CASCADE, related_name="course_mappings"
    )
    level_from = models.PositiveSmallIntegerField()  # 1–4 (proficiency before)
    level_to = models.PositiveSmallIntegerField()  # 2–5 (proficiency after)

    class Meta:
        db_table = "learning_courseskill"
        unique_together = [("course", "skill")]

    def __str__(self) -> str:
        return f"{self.course} → {self.skill} ({self.level_from}→{self.level_to})"


class EnrollmentStatus(models.TextChoices):
    ENROLLED = "ENROLLED", "Enrolled"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    COMPLETED = "COMPLETED", "Completed"
    DROPPED = "DROPPED", "Dropped"


class Enrollment(BaseModel):
    """An employee's enrollment in a course."""

    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="enrollments"
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    status = models.CharField(
        max_length=20, choices=EnrollmentStatus.choices, default=EnrollmentStatus.ENROLLED
    )
    progress_pct = models.PositiveSmallIntegerField(default=0)
    certificate_url = models.URLField(blank=True)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        db_table = "learning_enrollment"
        unique_together = [("employee", "course")]
        ordering = ["-enrolled_at"]

    def __str__(self) -> str:
        return f"{self.employee} → {self.course} ({self.status})"
