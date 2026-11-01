from django.db import models


class Role(models.TextChoices):
    EMPLOYEE = "EMPLOYEE", "Employee"
    MANAGER = "MANAGER", "Manager"
    HR_ADMIN = "HR_ADMIN", "HR Admin"
    EXECUTIVE = "EXECUTIVE", "Executive"
