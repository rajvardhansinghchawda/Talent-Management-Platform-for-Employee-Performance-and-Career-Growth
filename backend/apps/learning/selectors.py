"""Selectors for Course Catalog."""

import uuid

from django.db.models import Q, QuerySet

from apps.core.exceptions import NotFound
from apps.learning.models import Course


def list_courses(
    q: str | None = None,
    skill: uuid.UUID | None = None,
    difficulty: str | None = None,
    course_format: str | None = None,
    is_active: bool | None = None,
) -> QuerySet[Course]:
    qs = Course.objects.prefetch_related("skill_mappings__skill", "enrollments")
    if is_active is not None:
        qs = qs.filter(is_active=is_active)
    if difficulty:
        qs = qs.filter(difficulty__iexact=difficulty)
    if course_format:
        qs = qs.filter(format__iexact=course_format)
    if skill:
        qs = qs.filter(skill_mappings__skill_id=skill)
    if q:
        qs = qs.filter(
            Q(title__icontains=q) | Q(provider__icontains=q) | Q(description__icontains=q)
        )
    return qs.distinct().order_by("title")


def get_course_by_id(course_id: uuid.UUID) -> Course:
    try:
        return Course.objects.prefetch_related("skill_mappings__skill", "enrollments").get(
            pk=course_id
        )
    except Course.DoesNotExist:
        raise NotFound(message="Course not found.")
