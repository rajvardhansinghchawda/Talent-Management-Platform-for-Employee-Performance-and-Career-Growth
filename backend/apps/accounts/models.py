import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

from .constants import Role


class UserManager(BaseUserManager):
    def create_user(self, email: str, password: str | None = None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", Role.HR_ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom user model for the Talent Management Platform."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.EMPLOYEE)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # Password management
    must_change_password = models.BooleanField(default=False)
    invite_token = models.CharField(max_length=128, blank=True, null=True, unique=True)
    invite_expires_at = models.DateTimeField(null=True, blank=True)

    # Audit timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    failed_login_attempts = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = "accounts_user"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self) -> str:
        return self.email

    @property
    def is_locked(self) -> bool:
        if self.locked_until and self.locked_until > timezone.now():
            return True
        return False

    @property
    def available_portals(self) -> list[str]:
        portals = []
        if self.role == Role.EMPLOYEE:
            portals = ["employee"]
        elif self.role == Role.MANAGER:
            portals = ["manager", "employee"]
        elif self.role == Role.HR_ADMIN:
            portals = ["hr"]
            if hasattr(self, "employee_profile"):
                portals.append("employee")
        elif self.role == Role.EXECUTIVE:
            portals = ["executive"]
        return portals
