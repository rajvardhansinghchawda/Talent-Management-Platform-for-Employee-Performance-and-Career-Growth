"""Report job model — tracks async CSV/PDF report generation."""

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class ReportFormat(models.TextChoices):
    CSV = "CSV", "CSV"
    PDF = "PDF", "PDF"


class ReportStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    RUNNING = "RUNNING", "Running"
    SUCCEEDED = "SUCCEEDED", "Succeeded"
    FAILED = "FAILED", "Failed"


class ReportJob(BaseModel):
    """Tracks an asynchronous report generation job."""

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="report_jobs",
    )
    report_type = models.CharField(max_length=100)
    filters = models.JSONField(default=dict, blank=True)
    format = models.CharField(max_length=5, choices=ReportFormat.choices, default=ReportFormat.CSV)
    status = models.CharField(
        max_length=20, choices=ReportStatus.choices, default=ReportStatus.PENDING
    )
    progress_pct = models.PositiveSmallIntegerField(default=0)
    file = models.FileField(upload_to="reports/", null=True, blank=True)
    error = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "reports_reportjob"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.report_type} — {self.status}"


class ImportJob(BaseModel):
    """Tracks an asynchronous CSV import job."""

    class ImportType(models.TextChoices):
        EMPLOYEES = "EMPLOYEES", "Employees"
        SKILLS = "SKILLS", "Skills"

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="import_jobs",
    )
    import_type = models.CharField(max_length=20, choices=ImportType.choices)
    uploaded_file = models.FileField(upload_to="imports/")
    status = models.CharField(
        max_length=20, choices=ReportStatus.choices, default=ReportStatus.PENDING
    )
    total_rows = models.PositiveIntegerField(default=0)
    processed_rows = models.PositiveIntegerField(default=0)
    errors = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "reports_importjob"
        ordering = ["-created_at"]
