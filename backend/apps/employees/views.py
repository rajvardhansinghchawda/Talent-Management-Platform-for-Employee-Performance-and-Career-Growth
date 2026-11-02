"""Employee views — directory, profiles, hierarchy, manager history, and CSV import."""

from __future__ import annotations

import csv
import io
import uuid

from django.core.cache import cache
from django.core.files.base import ContentFile
from django.db.models import Q
from django.http import HttpResponse
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.core.permissions import HasRole
from apps.reports.models import ImportJob, ReportStatus

from . import selectors, services
from .models import Employee, EmploymentStatus, ManagerHistory
from .serializers import (
    ChangeManagerSerializer,
    EmployeeDetailSerializer,
    EmployeeDirectorySerializer,
    EmployeeSelfUpdateSerializer,
    ManagerHistorySerializer,
    UserEmployeeCreateSerializer,
)


class EmployeeListView(APIView):
    """
    GET /api/v1/employees/
    Supports ?scope=directory | manager_candidates
    Filters: q, department, job_role, manager, status, ordering
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        qs = Employee.objects.select_related("user", "department", "job_role", "manager")

        scope = request.query_params.get("scope")
        if scope == "directory":
            # Active only, limited fields
            qs = qs.filter(is_active=True, employment_status=EmploymentStatus.ACTIVE)
            q = request.query_params.get("q")
            if q:
                qs = qs.filter(
                    Q(first_name__icontains=q)
                    | Q(last_name__icontains=q)
                    | Q(preferred_name__icontains=q)
                    | Q(job_role__title__icontains=q)
                    | Q(department__name__icontains=q)
                )
            serializer = EmployeeDirectorySerializer(qs[:100], many=True)
            return Response(serializer.data)

        if scope == "manager_candidates":
            # Active employees eligible to be managers
            qs = qs.filter(is_active=True)
            q = request.query_params.get("q")
            if q:
                qs = qs.filter(
                    Q(first_name__icontains=q)
                    | Q(last_name__icontains=q)
                    | Q(employee_code__icontains=q)
                )
            serializer = EmployeeDirectorySerializer(qs[:50], many=True)
            return Response(serializer.data)

        # Full employee list (accessible to HR Admin or Manager)
        if request.user.role not in ["HR_ADMIN", "MANAGER"]:
            # Fallback to directory view for employees
            qs = qs.filter(is_active=True)
            return Response(EmployeeDirectorySerializer(qs[:50], many=True).data)

        # Apply standard filters
        department = request.query_params.get("department")
        if department:
            qs = qs.filter(department_id=department)

        job_role = request.query_params.get("job_role")
        if job_role:
            qs = qs.filter(job_role_id=job_role)

        manager = request.query_params.get("manager")
        if manager:
            qs = qs.filter(manager_id=manager)

        emp_status = request.query_params.get("status")
        if emp_status:
            qs = qs.filter(employment_status=emp_status)

        q = request.query_params.get("q")
        if q:
            qs = qs.filter(
                Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(employee_code__icontains=q)
                | Q(user__email__icontains=q)
            )

        ordering = request.query_params.get("ordering", "first_name")
        if ordering:
            qs = qs.order_by(ordering)

        serializer = EmployeeDetailSerializer(qs[:100], many=True)
        return Response(serializer.data)


class UserEmployeeCreateView(APIView):
    """POST /api/v1/users/ — Atomic creation of User and Employee (HR Admin only)."""

    permission_classes = [HasRole.hr_admin()]

    def post(self, request: Request) -> Response:
        serializer = UserEmployeeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user, employee, temp_password = services.create_employee_with_user(
            data=serializer.validated_data,
            actor=request.user,
            request=request,
        )

        response_data = {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "role": user.role,
                "must_change_password": user.must_change_password,
            },
            "employee": EmployeeDetailSerializer(employee).data,
        }
        if temp_password:
            response_data["temporary_password"] = temp_password

        return Response(response_data, status=status.HTTP_201_CREATED)


class EmployeeMeView(APIView):
    """GET, PATCH /api/v1/employees/me/ — Current authenticated employee profile."""

    permission_classes = [IsAuthenticated]

    def get_employee(self, user):
        try:
            return Employee.objects.select_related("user", "department", "job_role", "manager").get(
                user=user
            )
        except Employee.DoesNotExist:
            return None

    def get(self, request: Request) -> Response:
        emp = self.get_employee(request.user)
        if not emp:
            return Response(
                {"error": {"code": "not_found", "message": "Employee profile not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(EmployeeDetailSerializer(emp).data)

    def patch(self, request: Request) -> Response:
        emp = self.get_employee(request.user)
        if not emp:
            return Response(
                {"error": {"code": "not_found", "message": "Employee profile not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = EmployeeSelfUpdateSerializer(emp, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(EmployeeDetailSerializer(updated).data)


class EmployeeMePhotoView(APIView):
    """POST, DELETE /api/v1/employees/me/photo/"""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request: Request) -> Response:
        try:
            emp = request.user.employee_profile
        except Exception:
            return Response(
                {"error": {"code": "not_found", "message": "Employee profile not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        file_obj = request.FILES.get("photo")
        if not file_obj:
            return Response(
                {"error": {"code": "validation_error", "message": "No photo file provided."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        url = services.update_employee_photo(emp, file_obj, request.user, request=request)
        return Response({"photo_url": url}, status=status.HTTP_200_OK)

    def delete(self, request: Request) -> Response:
        try:
            emp = request.user.employee_profile
            services.delete_employee_photo(emp, request.user, request=request)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception:
            return Response(
                {"error": {"code": "not_found", "message": "Employee profile not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )


class EmployeeDetailView(APIView):
    """GET, PATCH /api/v1/employees/{id}/"""

    permission_classes = [IsAuthenticated]

    def get_employee(self, pk, user):
        emp = selectors.get_employee_by_id(pk)
        if not emp:
            return None

        # Check access permission:
        # HR Admin -> Allowed
        # Self -> Allowed
        # Manager -> Allowed only if employee is in manager's reporting tree
        if user.role == "HR_ADMIN":
            return emp
        if emp.user == user:
            return emp
        if user.role == "MANAGER" and hasattr(user, "employee_profile"):
            team = selectors.reports_to_tree(user.employee_profile)
            if emp in team:
                return emp

        # Hide existence from unauthorized users
        return None

    def get(self, request: Request, pk) -> Response:
        emp = self.get_employee(pk, request.user)
        if not emp:
            return Response(
                {"error": {"code": "not_found", "message": "Employee not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(EmployeeDetailSerializer(emp).data)

    def patch(self, request: Request, pk) -> Response:
        # Only HR Admin can patch arbitrary employee fields
        if request.user.role != "HR_ADMIN":
            return Response(
                {"error": {"code": "permission_denied", "message": "Permission denied."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        emp = selectors.get_employee_by_id(pk)
        if not emp:
            return Response(
                {"error": {"code": "not_found", "message": "Employee not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = EmployeeDetailSerializer(emp, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(EmployeeDetailSerializer(updated).data)


class EmployeeTeamView(APIView):
    """GET /api/v1/employees/{id}/team/ — returns direct and indirect reports."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk) -> Response:
        mgr = selectors.get_employee_by_id(pk)
        if not mgr:
            return Response(
                {"error": {"code": "not_found", "message": "Employee not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        team = selectors.reports_to_tree(mgr)
        return Response(EmployeeDirectorySerializer(team, many=True).data)


class EmployeeChangeManagerView(APIView):
    """POST /api/v1/employees/{id}/change-manager/ (HR Admin only)."""

    permission_classes = [HasRole.hr_admin()]

    def post(self, request: Request, pk) -> Response:
        emp = selectors.get_employee_by_id(pk)
        if not emp:
            return Response(
                {"error": {"code": "not_found", "message": "Employee not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ChangeManagerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated = services.change_employee_manager(
            employee=emp,
            new_manager=serializer.validated_data["manager"],
            effective_date=serializer.validated_data["effective_date"],
            reason=serializer.validated_data.get("reason", ""),
            actor=request.user,
            request=request,
        )

        return Response(EmployeeDetailSerializer(updated).data)


class EmployeeManagerHistoryView(APIView):
    """GET /api/v1/employees/{id}/manager-history/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk) -> Response:
        emp = selectors.get_employee_by_id(pk)
        if not emp:
            return Response(
                {"error": {"code": "not_found", "message": "Employee not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # HR Admin, Self, or current manager
        if (
            request.user.role != "HR_ADMIN"
            and emp.user != request.user
            and (
                not hasattr(request.user, "employee_profile")
                or emp.manager != request.user.employee_profile
            )
        ):
            return Response(
                {"error": {"code": "not_found", "message": "Employee not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        history = ManagerHistory.objects.filter(employee=emp).select_related(
            "manager", "changed_by"
        )
        return Response(ManagerHistorySerializer(history, many=True).data)


class EmployeeDeactivateView(APIView):
    """POST /api/v1/employees/{id}/deactivate/ (HR Admin only)."""

    permission_classes = [HasRole.hr_admin()]

    def post(self, request: Request, pk) -> Response:
        emp = selectors.get_employee_by_id(pk)
        if not emp:
            return Response(
                {"error": {"code": "not_found", "message": "Employee not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        reason = request.data.get("reason", "")
        updated = services.deactivate_employee(
            emp, reason=reason, actor=request.user, request=request
        )
        return Response(EmployeeDetailSerializer(updated).data)


class EmployeeReactivateView(APIView):
    """POST /api/v1/employees/{id}/reactivate/ (HR Admin only)."""

    permission_classes = [HasRole.hr_admin()]

    def post(self, request: Request, pk) -> Response:
        emp = selectors.get_employee_by_id(pk)
        if not emp:
            return Response(
                {"error": {"code": "not_found", "message": "Employee not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        updated = services.reactivate_employee(emp, actor=request.user, request=request)
        return Response(EmployeeDetailSerializer(updated).data)


# ─── Employee CSV Import Views ────────────────────────────────────────────────


class EmployeeImportTemplateView(APIView):
    """GET /api/v1/employees/import/template/ — Download sample CSV template."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> HttpResponse:
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="employee_import_template.csv"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "employee_code",
                "email",
                "first_name",
                "last_name",
                "department",
                "job_role",
                "manager_employee_code",
                "joining_date",
                "location",
            ]
        )
        writer.writerow(
            [
                "EMP001",
                "rahul.sharma@example.com",
                "Rahul",
                "Sharma",
                "Engineering",
                "Junior Python Developer",
                "",
                "2024-01-15",
                "Bengaluru",
            ]
        )
        return response


class EmployeeImportPreviewView(APIView):
    """
    POST /api/v1/employees/import/preview/
    Multipart CSV upload; validates rows without database commit.
    """

    permission_classes = [HasRole.hr_admin()]
    parser_classes = [MultiPartParser]

    def post(self, request: Request) -> Response:
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response(
                {"error": {"code": "validation_error", "message": "No CSV file provided."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            content = file_obj.read().decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(content))
        except Exception as e:
            return Response(
                {"error": {"code": "validation_error", "message": f"Malformed CSV file: {str(e)}"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        preview_rows = []
        errors = []
        row_idx = 1
        seen_codes = set()
        seen_emails = set()

        for row in reader:
            row_idx += 1
            code = row.get("employee_code", "").strip()
            email = row.get("email", "").strip().lower()

            row_errors = []
            if not code:
                row_errors.append("employee_code is required")
            elif code in seen_codes:
                row_errors.append(f"Duplicate employee_code in file: {code}")
            elif Employee.objects.filter(employee_code=code).exists():
                row_errors.append(f"employee_code already exists: {code}")
            seen_codes.add(code)

            if not email:
                row_errors.append("email is required")
            elif email in seen_emails:
                row_errors.append(f"Duplicate email in file: {email}")
            elif User.objects.filter(email=email).exists():
                row_errors.append(f"User with email already exists: {email}")
            seen_emails.add(email)

            if not row.get("first_name", "").strip():
                row_errors.append("first_name is required")
            if not row.get("last_name", "").strip():
                row_errors.append("last_name is required")

            if row_errors:
                errors.append({"row": row_idx, "message": "; ".join(row_errors), "row_data": row})

            if len(preview_rows) < 20:
                preview_rows.append(row)

        upload_id = str(uuid.uuid4())
        cache.set(f"import_csv_{upload_id}", content, timeout=3600)

        return Response(
            {
                "upload_id": upload_id,
                "total_rows": row_idx - 1,
                "preview_rows": preview_rows,
                "errors": errors,
                "can_commit": len(errors) == 0,
            }
        )


class EmployeeImportCommitView(APIView):
    """
    POST /api/v1/employees/import/
    Launches asynchronous Celery import job. Returns 202 with job_id.
    """

    permission_classes = [HasRole.hr_admin()]

    def post(self, request: Request) -> Response:
        file_obj = request.FILES.get("file")
        if not file_obj:
            upload_id = request.data.get("upload_id")
            if upload_id:
                cached_content = cache.get(f"import_csv_{upload_id}")
                if cached_content:
                    file_obj = ContentFile(cached_content.encode("utf-8"), name=f"import_{upload_id}.csv")

        if not file_obj:
            return Response(
                {"error": {"code": "validation_error", "message": "CSV file or valid upload_id required for commit."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job = ImportJob.objects.create(
            requested_by=request.user,
            import_type=ImportJob.ImportType.EMPLOYEES,
            uploaded_file=file_obj,
            status=ReportStatus.PENDING,
        )

        from .tasks import run_employee_import

        try:
            run_employee_import.delay(str(job.id))
        except Exception:
            run_employee_import(str(job.id))

        return Response(
            {"job_id": str(job.id), "status": job.status},
            status=status.HTTP_202_ACCEPTED,
        )


class EmployeeImportJobDetailView(APIView):
    """GET /api/v1/employees/import/{job_id}/ — track CSV import progress."""

    permission_classes = [HasRole.hr_admin()]

    def get(self, request: Request, job_id: str) -> Response:
        try:
            job = ImportJob.objects.get(id=job_id)
        except ImportJob.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "Import job not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        progress_pct = int(job.processed_rows / job.total_rows * 100) if job.total_rows > 0 else 0
        return Response(
            {
                "job_id": str(job.id),
                "status": job.status,
                "total_rows": job.total_rows,
                "processed_rows": job.processed_rows,
                "progress_pct": progress_pct,
                "errors": job.errors,
            }
        )
