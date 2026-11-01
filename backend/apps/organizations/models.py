from django.db import models

from apps.core.models import BaseModel


class Organization(BaseModel):
    """Single organization model for company-wide settings & branding."""

    name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to="org/logos/", null=True, blank=True)
    accent_color = models.CharField(max_length=7, default="#4F46E5")  # Hex color
    settings_general = models.JSONField(default=dict, blank=True)
    settings_performance = models.JSONField(default=dict, blank=True)
    settings_career = models.JSONField(default=dict, blank=True)
    settings_privacy = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "organizations_organization"

    def __str__(self) -> str:
        return self.name

    @property
    def logo_url(self) -> str | None:
        if self.logo:
            return self.logo.url
        return None


class Department(BaseModel):
    """Department in hierarchical tree."""

    name = models.CharField(max_length=255)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="children"
    )
    head = models.ForeignKey(
        "employees.Employee",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="headed_departments",
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "organizations_department"
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name

    @property
    def employee_count(self) -> int:
        return self.employees.filter(is_active=True).count()
