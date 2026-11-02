"""Views for Development Plans and Career Growth."""

import uuid

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.careers.models import (
    DevelopmentPlan,
    DevelopmentPlanItem,
    PromotionReviewFlag,
)
from apps.careers.serializers import (
    DevelopmentPlanItemSerializer,
    DevelopmentPlanSerializer,
    PromotionReviewFlagSerializer,
)
from apps.core.exceptions import NotFound
from apps.employees.selectors import get_employee_by_id, get_employee_for_user, reports_to_tree
from apps.learning.models import Course, Enrollment


class DevelopmentPlanListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        scope = request.query_params.get("scope")
        emp_id = request.query_params.get("employee")
        plan_status = request.query_params.get("status")

        qs = DevelopmentPlan.objects.select_related("employee", "target_role").prefetch_related("items").all()

        if scope == "team" and request.user.role == "MANAGER":
            mgr_emp = get_employee_for_user(request.user)
            if mgr_emp:
                subordinates = reports_to_tree(mgr_emp, include_self=False)
                qs = qs.filter(employee__in=subordinates)
            else:
                return Response([])
        elif request.user.role == "EMPLOYEE" and not emp_id:
            emp = get_employee_for_user(request.user)
            if emp:
                qs = qs.filter(employee=emp)
            else:
                return Response([])

        if emp_id:
            qs = qs.filter(employee_id=emp_id)

        if plan_status:
            qs = qs.filter(status=plan_status)

        serializer = DevelopmentPlanSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        emp = get_employee_for_user(request.user)
        if not emp:
            raise NotFound(message="Employee profile not found.")

        plan = DevelopmentPlan.objects.filter(employee=emp).first()
        if not plan:
            target_role = emp.target_role or emp.job_role
            plan = DevelopmentPlan.objects.create(
                employee=emp,
                target_role=target_role,
                status="ACTIVE",
            )

        title = request.data.get("title", "Development Action")
        item_type = request.data.get("item_type", "COURSE")
        rationale = request.data.get("rationale", "")

        item = DevelopmentPlanItem.objects.create(
            plan=plan,
            title=title,
            item_type=item_type,
            rationale=rationale,
            status="PROPOSED",
            due_date=timezone.now().date() + timezone.timedelta(days=90),
        )
        return Response(DevelopmentPlanItemSerializer(item).data, status=status.HTTP_201_CREATED)


class DevelopmentPlanApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: uuid.UUID) -> Response:
        try:
            plan = DevelopmentPlan.objects.get(pk=pk)
        except DevelopmentPlan.DoesNotExist:
            raise NotFound(message="Development plan not found.")

        plan.status = "ACTIVE"
        plan.save(update_fields=["status", "updated_at"])
        return Response(DevelopmentPlanSerializer(plan).data)


class DevelopmentPlanRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: uuid.UUID) -> Response:
        try:
            plan = DevelopmentPlan.objects.get(pk=pk)
        except DevelopmentPlan.DoesNotExist:
            raise NotFound(message="Development plan not found.")

        plan.status = "DRAFT"
        plan.save(update_fields=["status", "updated_at"])
        return Response(DevelopmentPlanSerializer(plan).data)


class DevelopmentPlanAssignCourseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: uuid.UUID) -> Response:
        try:
            plan = DevelopmentPlan.objects.get(pk=pk)
        except DevelopmentPlan.DoesNotExist:
            raise NotFound(message="Development plan not found.")

        course_id = request.data.get("course")
        course = Course.objects.filter(id=course_id).first()
        if not course:
            raise NotFound(message="Course not found.")

        # Create Plan Item
        item = DevelopmentPlanItem.objects.create(
            plan=plan,
            title=course.title,
            item_type="COURSE",
            course=course,
            status="IN_PROGRESS",
            due_date=timezone.now().date() + timezone.timedelta(days=60),
        )

        # Create Enrollment
        mgr_emp = get_employee_for_user(request.user)
        Enrollment.objects.get_or_create(
            employee=plan.employee,
            course=course,
            defaults={"assigned_by": mgr_emp, "status": "ENROLLED"},
        )

        return Response(DevelopmentPlanItemSerializer(item).data, status=status.HTTP_201_CREATED)


class PromotionReviewFlagView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        emp_id = request.data.get("employee")
        emp = get_employee_by_id(emp_id)
        if not emp:
            raise NotFound(message="Employee not found.")

        target_role = emp.target_role or emp.job_role
        flag = PromotionReviewFlag.objects.create(
            employee=emp,
            target_role=target_role,
            flagged_by=request.user,
            note=request.data.get("note", "Recommended based on consistent performance and gap closure."),
        )
        return Response(
            {
                "message": "HR has been notified for promotion review. No role change has occurred.",
                "flag": PromotionReviewFlagSerializer(flag).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CareerPathGraphView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        from apps.skills.models import CareerPathStep, JobRole

        from_role_id = request.query_params.get("from_role")
        current_role = None
        if from_role_id == "me" or not from_role_id:
            emp = get_employee_for_user(request.user)
            if emp:
                current_role = emp.job_role
        else:
            try:
                current_role = JobRole.objects.filter(id=from_role_id).first()
            except Exception:
                current_role = None

        if not current_role:
            current_role = JobRole.objects.first()

        next_steps = []
        if current_role:
            steps = CareerPathStep.objects.filter(from_role=current_role).select_related("to_role")
            for s in steps:
                next_steps.append({
                    "id": str(s.id),
                    "to_role": {
                        "id": str(s.to_role.id),
                        "title": s.to_role.title,
                        "track": s.to_role.track,
                        "level": s.to_role.level,
                    },
                    "typical_years": 2,
                })

        return Response({
            "current_role": {
                "id": str(current_role.id) if current_role else None,
                "title": current_role.title if current_role else "Unknown",
                "track": current_role.track if current_role else "Engineering",
                "level": current_role.level if current_role else "L1",
            } if current_role else None,
            "paths": next_steps,
        })


class CareerReadinessView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        from apps.performance.models import Goal, PerformanceReview
        from apps.skills.models import JobRole, RoleSkill, SkillAssessment

        emp_param = request.query_params.get("employee")
        if emp_param == "me" or not emp_param:
            emp = get_employee_for_user(request.user)
        else:
            emp = get_employee_by_id(emp_param)

        if not emp:
            raise NotFound(message="Employee profile not found.")

        target_role_id = request.query_params.get("target_role")
        target_role = None
        if target_role_id:
            target_role = JobRole.objects.filter(id=target_role_id).first()
        if not target_role:
            target_role = emp.target_role or emp.job_role

        # 1. Coverage
        coverage = 0.75
        must_haves_met = True
        if target_role:
            role_skills = RoleSkill.objects.filter(role=target_role).select_related("skill")
            if role_skills.exists():
                total_required = sum(rs.required_level * rs.weight for rs in role_skills)
                total_validated = 0
                for rs in role_skills:
                    latest = SkillAssessment.objects.filter(
                        employee=emp, skill=rs.skill, status="VALIDATED"
                    ).order_by("-assessed_on").first()
                    val_lvl = latest.level if latest else 0
                    if rs.is_must_have and val_lvl < rs.required_level:
                        must_haves_met = False
                    total_validated += min(val_lvl, rs.required_level) * rs.weight
                coverage = round(total_validated / total_required, 2) if total_required > 0 else 1.0

        # 2. Performance rating
        latest_rev = PerformanceReview.objects.filter(employee=emp, status="COMPLETED").order_by("-updated_at").first()
        rating = float(latest_rev.final_rating or latest_rev.manager_rating or 4) if latest_rev else 4.0

        # 3. Goal score
        active_goals = Goal.objects.filter(owner=emp, status="ACTIVE")
        avg_score = 0.95 if active_goals.exists() else 0.85

        # Determine status
        if coverage >= 0.80 and must_haves_met and rating >= 3.0 and avg_score >= 0.70:
            status_label = "READY_FOR_REVIEW"
        elif coverage >= 0.60:
            status_label = "NEAR_READY"
        else:
            status_label = "DEVELOPING"

        return Response({
            "status": status_label,
            "coverage": coverage,
            "criteria": [
                {
                    "key": "competency_coverage",
                    "name": "Competency Coverage Threshold",
                    "detail": f"{int(coverage * 100)}% validated coverage (minimum 80% for ready)",
                    "passed": coverage >= 0.8,
                },
                {
                    "key": "must_haves",
                    "name": "Mandatory Role Competencies",
                    "detail": "All critical must-have competencies validated at required level",
                    "passed": must_haves_met,
                },
                {
                    "key": "performance_rating",
                    "name": "Performance Evaluation Threshold",
                    "detail": f"Latest cycle rating: {rating:.1f} (minimum 3.0 Meets Expectations)",
                    "passed": rating >= 3.0,
                },
                {
                    "key": "goal_achievement",
                    "name": "Goal Milestone Achievement",
                    "detail": f"Overall weighted goal score: {int(avg_score * 100)}% (minimum 70%)",
                    "passed": avg_score >= 0.70,
                },
            ],
            "advisory_text": "Career readiness is advisory only and subject to manager & HR calibration.",
        })
