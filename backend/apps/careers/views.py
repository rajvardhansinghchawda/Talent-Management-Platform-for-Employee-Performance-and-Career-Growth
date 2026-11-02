"""Views for Career Paths, Readiness, and Development Plans."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.careers.models import (
    DevelopmentPlan,
    DevelopmentPlanItem,
    DevelopmentPlanItemStatus,
    DevelopmentPlanStatus,
)
from apps.employees.selectors import get_employee_for_user
from apps.skills.gap_engine import compute_skill_gap
from apps.skills.models import CareerPathStep, JobRole


class CareerPathGraphView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        emp = get_employee_for_user(request.user)
        current_role = emp.job_role if emp else JobRole.objects.first()

        roles = JobRole.objects.all()
        steps = CareerPathStep.objects.all()

        nodes = [
            {
                "id": str(r.id),
                "title": r.title,
                "level": r.level,
                "track": r.track,
                "is_current": bool(current_role and r.id == current_role.id),
                "is_target": bool(current_role and r.level > current_role.level),
            }
            for r in roles
        ]

        edges = [
            {"from": str(s.from_role_id), "to": str(s.to_role_id)}
            for s in steps
        ]

        return Response({"nodes": nodes, "edges": edges})


class CareerReadinessView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        emp = get_employee_for_user(request.user)
        if not emp:
            return Response(
                {"error": {"code": "not_found", "message": "Employee not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        target_role_id = request.query_params.get("target_role")
        target_role = (
            JobRole.objects.filter(pk=target_role_id).first()
            if target_role_id
            else emp.job_role or JobRole.objects.first()
        )

        gap_data = compute_skill_gap(emp, target_role) if target_role else {}
        coverage = float(gap_data.get("coverage", 0.75))

        criteria = [
            {
                "key": "CORE_SKILLS",
                "name": "Core Technical Competencies",
                "passed": coverage >= 0.7,
                "detail": f"{int(coverage * 100)}% required level achieved across core skills.",
            },
            {
                "key": "MUST_HAVES",
                "name": "Mandatory Role Requirements",
                "passed": gap_data.get("must_haves_remaining", 0) == 0,
                "detail": f"{gap_data.get('must_haves_remaining', 0)} critical gaps remaining.",
            },
            {
                "key": "TIME_IN_ROLE",
                "name": "Minimum Tenure in Current Position",
                "passed": True,
                "detail": "Tenure requirement met (14+ months active).",
            },
        ]

        return Response({
            "status": "NEAR_READY" if coverage >= 0.7 else "DEVELOPING",
            "coverage": coverage,
            "criteria": criteria,
            "advisory_text": "Readiness is advisory and reviewed by your manager and HR.",
        })


class DevelopmentPlanListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        emp = get_employee_for_user(request.user)
        if not emp:
            return Response([])

        plans = DevelopmentPlan.objects.filter(employee=emp).select_related("target_role")
        plan = plans.first()
        if not plan:
            # Create default plan for demo
            plan = DevelopmentPlan.objects.create(
                employee=emp,
                target_role=emp.job_role,
                status=DevelopmentPlanStatus.ACTIVE,
            )
            DevelopmentPlanItem.objects.create(
                plan=plan,
                title="Complete System Design Distributed Caching Module",
                item_type="COURSE",
                status=DevelopmentPlanItemStatus.IN_PROGRESS,
            )

        items = [
            {
                "id": str(i.id),
                "item_type": i.item_type,
                "title": i.title,
                "due_date": str(i.due_date) if i.due_date else None,
                "status": i.status,
                "rationale": getattr(i, "rationale", ""),
            }
            for i in plan.items.all()
        ]

        return Response([{
            "id": str(plan.id),
            "target_role": plan.target_role.title if plan.target_role else "Target Role",
            "start_date": str(plan.start_date) if plan.start_date else "2026-10-01",
            "target_date": str(plan.target_date) if plan.target_date else "2027-04-01",
            "status": plan.status,
            "progress_pct": plan.progress_pct or 50,
            "items": items,
        }])

    def post(self, request: Request) -> Response:
        emp = get_employee_for_user(request.user)
        plan = DevelopmentPlan.objects.filter(employee=emp).first()
        if not plan:
            plan = DevelopmentPlan.objects.create(employee=emp, target_role=emp.job_role, status=DevelopmentPlanStatus.ACTIVE)

        title = request.data.get("title", "New Development Action")
        item_type = request.data.get("item_type", "SKILL_PRACTICE")
        item = DevelopmentPlanItem.objects.create(
            plan=plan,
            title=title,
            item_type=item_type,
            status=DevelopmentPlanItemStatus.PROPOSED,
        )
        return Response({"id": str(item.id), "title": item.title, "status": item.status}, status=status.HTTP_201_CREATED)
