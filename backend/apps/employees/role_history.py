"""Employee role history — append-only log of role changes for internal mobility analytics."""

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class EmployeeRoleHistory(BaseModel):
    """
    Tracks every role change for an employee.
    Written by the service whenever employee.job_role changes.
    Used by executive analytics for internal mobility trends.
    """

    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="role_history"
    )
    from_role = models.ForeignKey(
        "skills.JobRole",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="departures",
    )
    to_role = models.ForeignKey(
        "skills.JobRole",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="arrivals",
    )
    effective_date = models.DateField()
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    reason = models.TextField(blank=True)

    class Meta:
        db_table = "employees_rolehistory"
        ordering = ["-effective_date"]

    def __str__(self) -> str:
        return f"{self.employee}: {self.from_role} → {self.to_role} on {self.effective_date}"
