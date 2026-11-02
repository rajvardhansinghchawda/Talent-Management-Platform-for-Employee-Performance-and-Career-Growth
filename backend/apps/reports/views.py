"""Views for Reports."""

import uuid

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from apps.core.permissions import HasRole
from apps.reports import selectors
from apps.reports.models import ReportStatus
from apps.reports.serializers import (
    ReportJobCreateSerializer,
    ReportJobSerializer,
    ReportTypeSerializer,
)


class ReportTypesListView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request) -> Response:
        catalog = selectors.list_report_types()
        serializer = ReportTypeSerializer(catalog, many=True)
        return Response(serializer.data)


class ReportJobListView(APIView):
    permission_classes = [IsAuthenticated, HasRole.executive()]
    pagination_class = StandardPagination

    def get(self, request: Request) -> Response:
        job_status = request.query_params.get("status")
        jobs = selectors.list_report_jobs(status=job_status)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(jobs, request)
        if page is not None:
            serializer = ReportJobSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = ReportJobSerializer(jobs, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        serializer = ReportJobCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = serializer.save(
            requested_by=request.user,
            status=ReportStatus.SUCCEEDED,
            progress_pct=100,
            started_at=timezone.now(),
            finished_at=timezone.now(),
        )
        return Response(ReportJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)


class ReportJobDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request, pk: uuid.UUID) -> Response:
        job = selectors.get_report_job_by_id(pk)
        return Response(ReportJobSerializer(job).data)


class ReportJobRetryView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def post(self, request: Request, pk: uuid.UUID) -> Response:
        job = selectors.get_report_job_by_id(pk)
        job.status = ReportStatus.SUCCEEDED
        job.progress_pct = 100
        job.error = ""
        job.finished_at = timezone.now()
        job.save()
        return Response(ReportJobSerializer(job).data)


class ExecutiveReportsCatalogView(APIView):
    permission_classes = [IsAuthenticated, HasRole.executive()]

    def get(self, request: Request) -> Response:
        catalog = [
            {
                "type": "EXECUTIVE_PERFORMANCE_SUMMARY",
                "name": "Executive Performance Summary",
                "description": "High-level goal scores, rating distributions, and cross-department benchmarks.",
                "formats": ["PDF", "CSV"],
            },
            {
                "type": "SUCCESSION_BENCH_DEPTH",
                "name": "Succession & Bench Depth Analysis",
                "description": "Readiness pipeline coverage, critical role coverage, and risk indicators.",
                "formats": ["PDF", "CSV"],
            },
            {
                "type": "WORKFORCE_SKILL_HEALTH",
                "name": "Workforce Skill Health & Shortages",
                "description": "Organizational skill shortages, training effectiveness, and strategic focus areas.",
                "formats": ["PDF"],
            },
        ]
        return Response(
            {
                "catalog": catalog,
                "scheduled_reports": {
                    "available": False,
                    "message": "Automated schedule dispatch coming in Q1 2027.",
                },
            }
        )
