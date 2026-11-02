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
