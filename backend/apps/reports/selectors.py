"""Selectors for Reports."""

import uuid

from django.db.models import QuerySet

from apps.core.exceptions import NotFound
from apps.reports.models import ReportJob

REPORT_CATALOG = [
    {
        "type": "PERFORMANCE_SUMMARY",
        "name": "Performance Summary Report",
        "description": "Aggregated goal scores, ratings, and review completion rates by department.",
        "formats": ["CSV", "PDF"],
        "filters_schema": {"cycle": "string", "department": "string"},
    },
    {
        "type": "SKILLS_INVENTORY",
        "name": "Skills Inventory & Shortages",
        "description": "Complete breakdown of validated vs self-assessed skills across departments.",
        "formats": ["CSV", "PDF"],
        "filters_schema": {"category": "string", "department": "string"},
    },
    {
        "type": "HEADCOUNT_HIERARCHY",
        "name": "Organization Headcount & Hierarchy",
        "description": "Detailed employee census including reporting lines, departments, and roles.",
        "formats": ["CSV", "PDF"],
        "filters_schema": {"department": "string", "status": "string"},
    },
    {
        "type": "AUDIT_SUMMARY",
        "name": "Security & Audit Event Trail",
        "description": "Chronological audit records for role changes, rating modifications, and settings changes.",
        "formats": ["CSV"],
        "filters_schema": {"action": "string", "date_from": "string", "date_to": "string"},
    },
]


def list_report_types() -> list[dict]:
    return REPORT_CATALOG


def list_report_jobs(status: str | None = None) -> QuerySet[ReportJob]:
    qs = ReportJob.objects.select_related("requested_by").all()
    if status:
        qs = qs.filter(status=status)
    return qs.order_by("-created_at")


def get_report_job_by_id(job_id: uuid.UUID) -> ReportJob:
    try:
        return ReportJob.objects.select_related("requested_by").get(pk=job_id)
    except ReportJob.DoesNotExist:
        raise NotFound(message="Report job not found.")
