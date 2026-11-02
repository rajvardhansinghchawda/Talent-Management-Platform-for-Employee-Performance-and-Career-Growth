"""Views for Skills, Job Roles, and Career Steps."""

import uuid

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import HasRole
from apps.skills import selectors, services
from apps.skills.models import RoleSkill
from apps.skills.serializers import (
    CareerPathStepSerializer,
    JobRoleCreateUpdateSerializer,
    JobRoleDetailSerializer,
    JobRoleListSerializer,
    RoleSkillCreateSerializer,
    RoleSkillSerializer,
    SkillCreateUpdateSerializer,
    SkillSerializer,
)


class SkillListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request) -> Response:
        q = request.query_params.get("q")
        category = request.query_params.get("category")
        is_active_raw = request.query_params.get("is_active")
        is_active = is_active_raw.lower() in ("true", "1") if is_active_raw is not None else None

        skills = selectors.list_skills(q=q, category=category, is_active=is_active)
        serializer = SkillSerializer(skills, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        serializer = SkillCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        skill = serializer.save()
        return Response(SkillSerializer(skill).data, status=status.HTTP_201_CREATED)


class SkillDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request, pk: uuid.UUID) -> Response:
        skill = selectors.get_skill_by_id(pk)
        return Response(SkillSerializer(skill).data)

    def patch(self, request: Request, pk: uuid.UUID) -> Response:
        skill = selectors.get_skill_by_id(pk)
        serializer = SkillCreateUpdateSerializer(skill, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(SkillSerializer(updated).data)

    def delete(self, request: Request, pk: uuid.UUID) -> Response:
        services.delete_skill(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SkillDeactivateView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def post(self, request: Request, pk: uuid.UUID) -> Response:
        skill = services.deactivate_skill(pk)
        return Response(SkillSerializer(skill).data)


class JobRoleListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request) -> Response:
        q = request.query_params.get("q")
        track = request.query_params.get("track")
        level_raw = request.query_params.get("level")
        level = int(level_raw) if level_raw and level_raw.isdigit() else None
        dept_raw = request.query_params.get("department")
        dept = uuid.UUID(dept_raw) if dept_raw else None

        roles = selectors.list_job_roles(q=q, track=track, level=level, department=dept)
        serializer = JobRoleListSerializer(roles, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        serializer = JobRoleCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        return Response(JobRoleDetailSerializer(role).data, status=status.HTTP_201_CREATED)


class JobRoleDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request, pk: uuid.UUID) -> Response:
        role = selectors.get_job_role_by_id(pk)
        return Response(JobRoleDetailSerializer(role).data)

    def patch(self, request: Request, pk: uuid.UUID) -> Response:
        role = selectors.get_job_role_by_id(pk)
        serializer = JobRoleCreateUpdateSerializer(role, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(JobRoleDetailSerializer(updated).data)


class JobRoleSkillsView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request, pk: uuid.UUID) -> Response:
        role = selectors.get_job_role_by_id(pk)
        skills = role.role_skills.select_related("skill")
        return Response(RoleSkillSerializer(skills, many=True).data)

    def post(self, request: Request, pk: uuid.UUID) -> Response:
        role = selectors.get_job_role_by_id(pk)
        serializer = RoleSkillCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rs = serializer.save(role=role)
        return Response(RoleSkillSerializer(rs).data, status=status.HTTP_201_CREATED)

    def put(self, request: Request, pk: uuid.UUID) -> Response:
        role = selectors.get_job_role_by_id(pk)
        if not isinstance(request.data, list):
            return Response(
                {"error": {"code": "bad_request", "message": "Expected a list of skills."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        new_skills = services.bulk_replace_role_skills(role, request.data)
        return Response(RoleSkillSerializer(new_skills, many=True).data)


class JobRoleSkillItemView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def delete(self, request: Request, pk: uuid.UUID, skill_id: uuid.UUID) -> Response:
        role = selectors.get_job_role_by_id(pk)
        RoleSkill.objects.filter(role=role, skill_id=skill_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class JobRoleCareerStepsView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request, pk: uuid.UUID) -> Response:
        role = selectors.get_job_role_by_id(pk)
        steps = role.career_steps_from.select_related("to_role")
        return Response(CareerPathStepSerializer(steps, many=True).data)

    def post(self, request: Request, pk: uuid.UUID) -> Response:
        role = selectors.get_job_role_by_id(pk)
        to_role_id = request.data.get("to_role")
        duration = request.data.get("typical_duration_months", 12)
        step = services.add_career_step(role, to_role_id, duration)
        return Response(CareerPathStepSerializer(step).data, status=status.HTTP_201_CREATED)


class JobRoleCareerStepItemView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def delete(self, request: Request, pk: uuid.UUID, to_role_id: uuid.UUID) -> Response:
        role = selectors.get_job_role_by_id(pk)
        services.remove_career_step(role, to_role_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SkillGapAnalysisView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        from apps.employees.selectors import get_employee_for_user
        from apps.skills.gap_engine import compute_skill_gap
        from apps.skills.models import JobRole

        emp = get_employee_for_user(request.user)
        if not emp:
            return Response(
                {"error": {"code": "not_found", "message": "Employee profile not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        target_role_id = request.query_params.get("target_role")
        if target_role_id:
            try:
                target_role = JobRole.objects.get(pk=target_role_id)
            except JobRole.DoesNotExist:
                return Response(
                    {"error": {"code": "not_found", "message": "Target role not found."}},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            target_role = emp.job_role or JobRole.objects.first()

        if not target_role:
            return Response(
                {"error": {"code": "not_found", "message": "No role available for gap analysis."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        gap_data = compute_skill_gap(emp, target_role)
        return Response(gap_data)


class EmployeeSkillsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        from apps.employees.selectors import get_employee_for_user
        from apps.skills.models import Skill, SkillAssessment

        emp = get_employee_for_user(request.user)
        if not emp:
            return Response(
                {"error": {"code": "not_found", "message": "Employee profile not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        skills = Skill.objects.filter(is_active=True)
        results = []
        for s in skills:
            assessments = SkillAssessment.objects.filter(employee=emp, skill=s).order_by("-created_at")
            validated = assessments.filter(status="VALIDATED").first()
            self_ass = assessments.filter(source="SELF").first()
            pending = assessments.filter(status="PENDING").exists()

            if validated or self_ass or pending:
                results.append({
                    "skill": {
                        "id": str(s.id),
                        "name": s.name,
                        "category": s.category,
                        "description": s.description,
                    },
                    "self_level": self_ass.level if self_ass else None,
                    "validated_level": validated.level if validated else None,
                    "last_validated_on": validated.created_at.isoformat() if validated else None,
                    "status": "VALIDATED" if validated else "SELF_REPORTED" if self_ass else "UNVALIDATED",
                    "has_pending_validation": pending,
                })
        return Response(results)
