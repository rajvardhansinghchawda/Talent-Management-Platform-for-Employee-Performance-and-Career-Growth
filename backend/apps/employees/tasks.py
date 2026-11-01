"""Celery tasks for employees app — CSV import processor."""

from __future__ import annotations

import csv
import io

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.organizations.models import Department
from apps.reports.models import ImportJob, ReportStatus
from apps.skills.models import JobRole

from .models import Employee, EmploymentStatus


@shared_task(name="employees.run_employee_import", bind=True, max_retries=1)
def run_employee_import(self, job_id: str) -> dict:
    """
    Parses uploaded CSV and imports employees.
    Idempotent per employee_code; updates progress along the way.
    """
    try:
        job = ImportJob.objects.select_related("requested_by").get(id=job_id)
    except ImportJob.DoesNotExist:
        return {"error": "Job not found"}

    job.status = ReportStatus.RUNNING
    job.save(update_fields=["status"])

    try:
        content = job.uploaded_file.read().decode("utf-8-sig")
        rows = list(csv.DictReader(io.StringIO(content)))
        job.total_rows = len(rows)
        job.save(update_fields=["total_rows"])

        processed = 0
        errors = []

        for idx, row in enumerate(rows, start=2):
            code = row.get("employee_code", "").strip()
            email = row.get("email", "").strip().lower()
            first_name = row.get("first_name", "").strip()
            last_name = row.get("last_name", "").strip()

            if not code or not email or not first_name or not last_name:
                errors.append(
                    {
                        "row": idx,
                        "message": "Missing required fields (code, email, first_name, or last_name)",
                    }
                )
                continue

            try:
                with transaction.atomic():
                    # Resolve department by name if provided
                    dept = None
                    dept_name = row.get("department", "").strip()
                    if dept_name:
                        dept, _ = Department.objects.get_or_create(name=dept_name)

                    # Resolve job role by title if provided
                    role_obj = None
                    role_title = row.get("job_role", "").strip()
                    if role_title:
                        role_obj, _ = JobRole.objects.get_or_create(title=role_title)

                    # Resolve manager by employee code if provided
                    mgr = None
                    mgr_code = row.get("manager_employee_code", "").strip()
                    if mgr_code:
                        mgr = Employee.objects.filter(employee_code=mgr_code).first()

                    # Create or update user
                    user, user_created = User.objects.get_or_create(
                        email=email,
                        defaults={
                            "role": "EMPLOYEE",
                            "must_change_password": True,
                        },
                    )
                    if user_created:
                        user.set_password("TempPass123!")
                        user.save()

                    # Create employee
                    emp, created = Employee.objects.get_or_create(
                        employee_code=code,
                        defaults={
                            "user": user,
                            "first_name": first_name,
                            "last_name": last_name,
                            "department": dept,
                            "job_role": role_obj,
                            "manager": mgr,
                            "location": row.get("location", "").strip(),
                            "joining_date": timezone.now().date(),
                            "employment_status": EmploymentStatus.ACTIVE,
                            "is_active": True,
                        },
                    )
                    processed += 1
            except Exception as e:
                errors.append({"row": idx, "message": str(e), "code": code})

            # Update batch progress periodically
            if idx % 10 == 0:
                job.processed_rows = processed
                job.save(update_fields=["processed_rows"])

        job.processed_rows = processed
        job.errors = errors
        job.status = ReportStatus.SUCCEEDED if len(errors) == 0 else ReportStatus.FAILED
        job.save(update_fields=["processed_rows", "errors", "status"])

        # Notify requester
        if job.requested_by:
            from apps.notifications.services import notify

            notify(
                user=job.requested_by,
                category="IMPORT_FINISHED",
                title="Employee CSV Import Finished",
                body=f"Processed {processed} rows with {len(errors)} error(s).",
                link="/hr/employees",
            )

        return {"processed": processed, "errors": len(errors)}

    except Exception as exc:
        job.status = ReportStatus.FAILED
        job.errors = [{"message": f"Fatal import failure: {str(exc)}"}]
        job.save(update_fields=["status", "errors"])
        return {"error": str(exc)}
