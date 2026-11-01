from django.conf import settings
from django.db import models

from apps.core.models import BaseModel
from apps.organizations.models import Department


class EmploymentStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    ON_LEAVE = "ON_LEAVE", "On Leave"
    EXITED = "EXITED", "Exited"


class Employee(BaseModel):
    """An employee profile linked to a User account."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="employee_profile",
    )
    employee_code = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    preferred_name = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    photo = models.ImageField(upload_to="employees/photos/", null=True, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    location = models.CharField(max_length=100, blank=True)

    department = models.ForeignKey(
        Department, null=True, blank=True, on_delete=models.SET_NULL, related_name="employees"
    )
    job_role = models.ForeignKey(
        "skills.JobRole", null=True, blank=True, on_delete=models.SET_NULL, related_name="employees"
    )
    manager = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="direct_reports"
    )
    target_role = models.ForeignKey(
        "skills.JobRole",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="targeting_employees",
    )

    joining_date = models.DateField(null=True, blank=True)
    employment_status = models.CharField(
        max_length=20, choices=EmploymentStatus.choices, default=EmploymentStatus.ACTIVE
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "employees_employee"
        ordering = ["first_name", "last_name"]

    def __str__(self) -> str:
        return self.full_name

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def designation(self) -> str | None:
        return self.job_role.title if self.job_role else None

    @property
    def photo_url(self) -> str | None:
        if self.photo:
            return self.photo.url
        return None
