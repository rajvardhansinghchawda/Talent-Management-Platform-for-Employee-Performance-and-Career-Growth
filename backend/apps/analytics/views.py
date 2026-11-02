"""Views for HR Analytics (5 tabs)."""

from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.analytics import selectors
from apps.core.permissions import HasRole


def _extract_analytics_filters(request: Request) -> dict:
    return {
        "department": request.query_params.get("department"),
        "role": request.query_params.get("role"),
        "cycle": request.query_params.get("cycle"),
        "date_from": request.query_params.get("date_from"),
        "date_to": request.query_params.get("date_to"),
    }


class PerformanceRatingDistributionView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request) -> Response:
        filters = _extract_analytics_filters(request)
        data = selectors.get_performance_rating_distribution(filters)
        return Response(data)


class PerformanceTrendView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request) -> Response:
        filters = _extract_analytics_filters(request)
        data = selectors.get_performance_trend(filters)
        return Response(data)


class SkillsHeatmapView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request) -> Response:
        filters = _extract_analytics_filters(request)
        data = selectors.get_skills_heatmap(filters)
        return Response(data)


class SkillsShortagesView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request) -> Response:
        filters = _extract_analytics_filters(request)
        data = selectors.get_skills_shortages(filters)
        return Response(data)


class TrainingCompletionView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request) -> Response:
        filters = _extract_analytics_filters(request)
        data = selectors.get_training_completion(filters)
        return Response(data)


class TrainingEffectivenessView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request) -> Response:
        filters = _extract_analytics_filters(request)
        data = selectors.get_training_effectiveness(filters)
        return Response(data)


class ReadinessByRoleView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request) -> Response:
        filters = _extract_analytics_filters(request)
        data = selectors.get_readiness_by_role(filters)
        return Response(data)


class ReadinessMobilityPipelineView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request) -> Response:
        filters = _extract_analytics_filters(request)
        data = selectors.get_readiness_mobility_pipeline(filters)
        return Response(data)


class NineBoxMatrixView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request) -> Response:
        filters = _extract_analytics_filters(request)
        data = selectors.get_nine_box_matrix(filters)
        return Response(data)


class TeamGoalProgressDistributionView(APIView):
    permission_classes = [IsAuthenticated, HasRole.manager()]

    def get(self, request: Request) -> Response:
        from apps.employees.selectors import get_employee_for_user, reports_to_tree
        from apps.performance.models import Goal, GoalStatus

        mgr_emp = get_employee_for_user(request.user)
        team = reports_to_tree(mgr_emp, include_self=False) if mgr_emp else []
        team_ids = [e.id for e in team]

        goals = Goal.objects.filter(
            owner_id__in=team_ids, status__in=[GoalStatus.ACTIVE, GoalStatus.COMPLETED]
        )
        buckets = [
            {"label": "0 - 25%", "count": goals.filter(current_value__lt=25).count()},
            {
                "label": "26 - 50%",
                "count": goals.filter(current_value__gte=25, current_value__lt=50).count(),
            },
            {
                "label": "51 - 75%",
                "count": goals.filter(current_value__gte=50, current_value__lt=75).count(),
            },
            {"label": "76 - 100%", "count": goals.filter(current_value__gte=75).count()},
        ]
        return Response({"buckets": buckets})


class TeamRatingTrendView(APIView):
    permission_classes = [IsAuthenticated, HasRole.manager()]

    def get(self, request: Request) -> Response:
        from apps.employees.selectors import get_employee_for_user, reports_to_tree
        from apps.performance.models import PerformanceReview, ReviewCycle

        mgr_emp = get_employee_for_user(request.user)
        team = reports_to_tree(mgr_emp, include_self=False) if mgr_emp else []
        team_ids = [e.id for e in team]

        cycles = ReviewCycle.objects.order_by("start_date")[:4]
        trend = []
        for c in cycles:
            reviews = PerformanceReview.objects.filter(cycle=c, employee_id__in=team_ids)
            ratings = [
                (r.final_rating or r.calibrated_rating or r.manager_rating)
                for r in reviews
                if (r.final_rating or r.calibrated_rating or r.manager_rating)
            ]
            avg = round(sum(ratings) / len(ratings), 2) if ratings else 4.0
            trend.append({"cycle_id": str(c.id), "cycle_name": c.name, "avg_rating": avg})
        return Response(trend)


class TeamSkillHeatmapView(APIView):
    permission_classes = [IsAuthenticated, HasRole.manager()]

    def get(self, request: Request) -> Response:
        from apps.employees.selectors import get_employee_for_user, reports_to_tree
        from apps.skills.models import Skill, SkillAssessment

        mgr_emp = get_employee_for_user(request.user)
        team = reports_to_tree(mgr_emp, include_self=False) if mgr_emp else []
        skills = list(Skill.objects.filter(is_active=True)[:6])

        rows = []
        for emp in team:
            levels = []
            for s in skills:
                ass = SkillAssessment.objects.filter(employee=emp, skill=s).first()
                levels.append(ass.level if ass else 2)
            rows.append({"employee_name": emp.name, "levels": levels})

        return Response(
            {
                "skills": [s.name for s in skills],
                "rows": rows,
            }
        )


class TeamTrainingCompletionView(APIView):
    permission_classes = [IsAuthenticated, HasRole.manager()]

    def get(self, request: Request) -> Response:
        from apps.employees.selectors import get_employee_for_user, reports_to_tree
        from apps.learning.models import Enrollment, EnrollmentStatus

        mgr_emp = get_employee_for_user(request.user)
        team = reports_to_tree(mgr_emp, include_self=False) if mgr_emp else []
        team_ids = [e.id for e in team]

        enrollments = Enrollment.objects.filter(employee_id__in=team_ids)
        completed = enrollments.filter(status=EnrollmentStatus.COMPLETED).count()
        in_progress = enrollments.filter(status=EnrollmentStatus.IN_PROGRESS).count()
        enrolled = enrollments.filter(status=EnrollmentStatus.ENROLLED).count()
        total = enrollments.count()

        return Response(
            {
                "completed": completed,
                "in_progress": in_progress,
                "enrolled": enrolled,
                "total": total,
                "completion_pct": round(completed / total * 100, 1) if total > 0 else 50.0,
            }
        )


class ExecutiveRatingDistributionView(APIView):
    permission_classes = [IsAuthenticated, HasRole.executive()]

    def get(self, request: Request) -> Response:
        cycle = request.query_params.get("cycle")
        data = selectors.get_executive_rating_distribution(cycle)
        return Response(data)


class ExecutiveRatingTrendView(APIView):
    permission_classes = [IsAuthenticated, HasRole.executive()]

    def get(self, request: Request) -> Response:
        data = selectors.get_performance_trend({})
        return Response(data)


class ExecutiveDepartmentComparisonView(APIView):
    permission_classes = [IsAuthenticated, HasRole.executive()]

    def get(self, request: Request) -> Response:
        cycle = request.query_params.get("cycle")
        data = selectors.get_executive_department_comparison(cycle)
        return Response(data)


class ExecutiveGoalAchievementView(APIView):
    permission_classes = [IsAuthenticated, HasRole.executive()]

    def get(self, request: Request) -> Response:
        cycle = request.query_params.get("cycle")
        data = selectors.get_executive_goal_achievement(cycle)
        return Response(data)


class ExecutiveSkillHeatmapView(APIView):
    permission_classes = [IsAuthenticated, HasRole.executive()]

    def get(self, request: Request) -> Response:
        data = selectors.get_skills_heatmap({})
        return Response(data)


class ExecutiveShortageRankingView(APIView):
    permission_classes = [IsAuthenticated, HasRole.executive()]

    def get(self, request: Request) -> Response:
        data = selectors.get_skills_shortages({})
        return Response(data)


class ExecutiveTrainingEffectivenessView(APIView):
    permission_classes = [IsAuthenticated, HasRole.executive()]

    def get(self, request: Request) -> Response:
        data = selectors.get_training_effectiveness({})
        return Response(data)


class ExecutiveFocusAreasView(APIView):
    permission_classes = [IsAuthenticated, HasRole.executive()]

    def get(self, request: Request) -> Response:
        data = selectors.get_executive_focus_areas()
        return Response(data)


class ExecutiveReadinessSummaryView(APIView):
    permission_classes = [IsAuthenticated, HasRole.executive()]

    def get(self, request: Request) -> Response:
        data = selectors.get_readiness_by_role({})
        return Response(data)


class ExecutiveBenchStrengthView(APIView):
    permission_classes = [IsAuthenticated, HasRole.executive()]

    def get(self, request: Request) -> Response:
        data = selectors.get_executive_bench_strength()
        return Response(data)


class ExecutiveNineBoxView(APIView):
    permission_classes = [IsAuthenticated, HasRole.executive()]

    def get(self, request: Request) -> Response:
        data = selectors.get_nine_box_matrix({})
        return Response(data)


class ExecutiveMobilityTrendsView(APIView):
    permission_classes = [IsAuthenticated, HasRole.executive()]

    def get(self, request: Request) -> Response:
        data = selectors.get_executive_mobility_trends()
        return Response(data)
