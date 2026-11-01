"""Employee domain services — onboarding, hierarchy management, lifecycle."""

from __future__ import annotations

import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.audit import services as audit_services
from apps.audit.models import AuditAction
from apps.core.exceptions import DomainException, StateConflict

from .models import Employee, EmploymentStatus, ManagerHistory
from .role_history import EmployeeRoleHistory


def validate_no_manager_cycle(employee_id, new_manager_id) -> None:
    """Ensure setting new_manager does not create a reporting loop."""
    if not new_manager_id or not employee_id:
        return
    if str(employee_id) == str(new_manager_id):
        raise StateConflict(
            message="An employee cannot report to themselves.",
            details={"reason": "CYCLE_DETECTED"},
        )

    curr_id = new_manager_id
    visited = {str(employee_id)}

    while curr_id:
        if str(curr_id) in visited:
            raise StateConflict(
                message="Setting this manager creates a circular reporting relationship.",
                details={"reason": "CYCLE_DETECTED"},
            )
        visited.add(str(curr_id))
        parent_mgr = (
            Employee.objects.filter(id=curr_id).values_list("manager_id", flat=True).first()
        )
        curr_id = parent_mgr


def create_employee_with_user(
    data: dict,
    actor: User,
    request=None,
    base_url: str = "http://localhost:3000",
) -> tuple[User, Employee, str | None]:
    """
    Atomically creates a User and linked Employee profile.
    Handles INVITE or TEMP_PASSWORD credentials.
    """
    email = data["email"].lower()
    role = data["role"]
    credential_mode = data["credential_mode"]
    manager = data.get("manager")

    if manager:
        # Initial create: employee doesn't have an ID yet, so no self-reference possible
        pass

    temp_password = None
    invite_token = None
    invite_expires_at = None

    if credential_mode == "TEMP_PASSWORD":
        # Generate secure random temporary password meeting policy
        raw_pw = secrets.token_urlsafe(10) + "A1!"
        temp_password = raw_pw
        must_change_password = True
    else:  # INVITE
        raw_pw = secrets.token_urlsafe(32) + "A1!"
        must_change_password = True
        invite_token = secrets.token_urlsafe(48)
        invite_expires_at = timezone.now() + timedelta(hours=72)

    with transaction.atomic():
        user = User.objects.create_user(
            email=email,
            password=raw_pw,
            role=role,
            must_change_password=must_change_password,
            invite_token=invite_token,
            invite_expires_at=invite_expires_at,
        )

        employee = Employee.objects.create(
            user=user,
            employee_code=data["employee_code"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            preferred_name=data.get("preferred_name", ""),
            phone=data.get("phone", ""),
            location=data.get("location", ""),
            bio=data.get("bio", ""),
            department=data.get("department"),
            job_role=data.get("job_role"),
            manager=manager,
            joining_date=data.get("joining_date") or timezone.now().date(),
            employment_status=EmploymentStatus.ACTIVE,
            is_active=True,
        )

        # Initial manager history entry
        if manager:
            ManagerHistory.objects.create(
                employee=employee,
                manager=manager,
                effective_date=employee.joining_date,
                changed_by=actor,
                reason="Initial assignment upon hiring",
            )

        # Initial role history entry
        if employee.job_role:
            EmployeeRoleHistory.objects.create(
                employee=employee,
                from_role=None,
                to_role=employee.job_role,
                effective_date=employee.joining_date,
                changed_by=actor,
                reason="Initial role upon hiring",
            )

        # Audit employee creation
        audit_services.log(
            actor=actor,
            action=AuditAction.EMPLOYEE_CREATED,
            entity=employee,
            entity_label=employee.full_name,
            after={
                "email": user.email,
                "role": user.role,
                "employee_code": employee.employee_code,
                "department": str(employee.department) if employee.department else None,
                "job_role": str(employee.job_role) if employee.job_role else None,
                "manager": str(employee.manager) if employee.manager else None,
            },
            summary=f"Created employee profile {employee.full_name} ({employee.employee_code})",
            request=request,
        )

    # Dispatch invite email asynchronously if INVITE mode
    if credential_mode == "INVITE":
        try:
            from apps.notifications.tasks import send_invite_email

            invite_link = f"{base_url}/reset-password?token={invite_token}"
            user_id = str(user.id)
            transaction.on_commit(
                lambda: send_invite_email.delay(user_id=user_id, invite_link=invite_link)
            )
        except Exception:
            pass

    return user, employee, temp_password


def change_employee_manager(
    employee: Employee,
    new_manager: Employee | None,
    effective_date,
    reason: str,
    actor: User,
    request=None,
) -> Employee:
    """Updates an employee's reporting manager with cycle checks and history tracking."""
    if new_manager:
        validate_no_manager_cycle(employee.id, new_manager.id)

    old_manager = employee.manager
    if old_manager == new_manager:
        return employee

    before_snapshot = {"manager": str(old_manager) if old_manager else None}

    employee.manager = new_manager
    employee.save(update_fields=["manager", "updated_at"])

    after_snapshot = {"manager": str(new_manager) if new_manager else None}

    # Record history
    ManagerHistory.objects.create(
        employee=employee,
        manager=new_manager,
        effective_date=effective_date,
        changed_by=actor,
        reason=reason,
    )

    # Audit
    audit_services.log(
        actor=actor,
        action=AuditAction.MANAGER_CHANGED,
        entity=employee,
        entity_label=employee.full_name,
        before=before_snapshot,
        after=after_snapshot,
        summary=f"Changed manager of {employee.full_name} from {old_manager} to {new_manager}",
        request=request,
    )

    return employee


def deactivate_employee(
    employee: Employee,
    reason: str,
    actor: User,
    request=None,
) -> Employee:
    """Deactivate employee profile and freeze user access."""
    # Check if this employee's linked user is the last active HR Admin
    linked_user = employee.user
    if linked_user.role == "HR_ADMIN" and linked_user.is_active:
        remaining_hr = (
            User.objects.filter(role="HR_ADMIN", is_active=True).exclude(id=linked_user.id).count()
        )
        if remaining_hr == 0:
            raise StateConflict(
                message="Cannot deactivate the last active HR Admin.",
                details={"reason": "LAST_HR_ADMIN"},
            )

    before_snapshot = {
        "is_active": employee.is_active,
        "employment_status": employee.employment_status,
    }

    with transaction.atomic():
        employee.is_active = False
        employee.employment_status = EmploymentStatus.EXITED
        employee.save(update_fields=["is_active", "employment_status", "updated_at"])

        linked_user.is_active = False
        linked_user.save(update_fields=["is_active", "updated_at"])

        after_snapshot = {
            "is_active": employee.is_active,
            "employment_status": employee.employment_status,
        }

        audit_services.log(
            actor=actor,
            action=AuditAction.USER_DEACTIVATED,
            entity=employee,
            entity_label=employee.full_name,
            before=before_snapshot,
            after=after_snapshot,
            summary=f"Deactivated employee {employee.full_name}. Reason: {reason or 'None provided'}",
            request=request,
        )

    return employee


def reactivate_employee(
    employee: Employee,
    actor: User,
    request=None,
) -> Employee:
    """Reactivate an employee and linked user account."""
    with transaction.atomic():
        employee.is_active = True
        employee.employment_status = EmploymentStatus.ACTIVE
        employee.save(update_fields=["is_active", "employment_status", "updated_at"])

        linked_user = employee.user
        linked_user.is_active = True
        linked_user.save(update_fields=["is_active", "updated_at"])

        audit_services.log(
            actor=actor,
            action=AuditAction.USER_ROLE_CHANGED,
            entity=employee,
            entity_label=employee.full_name,
            summary=f"Reactivated employee {employee.full_name}",
            request=request,
        )

    return employee


def update_employee_photo(employee: Employee, photo_file, actor: User, request=None) -> str:
    """Validate and upload employee avatar photo."""
    max_bytes = 2 * 1024 * 1024
    if photo_file.size > max_bytes:
        raise DomainException(
            message="Photo file size exceeds the 2 MB limit.",
            details={"file_size": photo_file.size, "max_size": max_bytes},
        )

    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if hasattr(photo_file, "content_type") and photo_file.content_type not in allowed_types:
        raise DomainException(
            message=f"Unsupported image type '{photo_file.content_type}'. Must be PNG, JPEG, or WEBP.",
            details={"content_type": photo_file.content_type},
        )

    employee.photo = photo_file
    employee.save(update_fields=["photo", "updated_at"])
    return employee.photo_url or ""


def delete_employee_photo(employee: Employee, actor: User, request=None) -> None:
    """Remove employee profile photo."""
    if employee.photo:
        employee.photo.delete(save=False)
        employee.photo = None
        employee.save(update_fields=["photo", "updated_at"])
