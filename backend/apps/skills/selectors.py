"""Selectors for Skills and Job Roles."""

import uuid

from django.db.models import Q, QuerySet

from apps.core.exceptions import NotFound
from apps.skills.models import JobRole, Skill


def list_skills(
    q: str | None = None,
    category: str | None = None,
    is_active: bool | None = None,
) -> QuerySet[Skill]:
    qs = Skill.objects.all()
    if is_active is not None:
        qs = qs.filter(is_active=is_active)
    if category:
        qs = qs.filter(category__iexact=category)
    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))
    return qs.order_by("category", "name")


def get_skill_by_id(skill_id: uuid.UUID) -> Skill:
    try:
        return Skill.objects.get(pk=skill_id)
    except Skill.DoesNotExist:
        raise NotFound(message="Skill not found.")


def list_job_roles(
    q: str | None = None,
    track: str | None = None,
    level: int | None = None,
    department: uuid.UUID | None = None,
) -> QuerySet[JobRole]:
    qs = JobRole.objects.select_related("department").prefetch_related(
        "role_skills", "next_steps"
    )
    if department:
        qs = qs.filter(department_id=department)
    if track:
        qs = qs.filter(track__iexact=track)
    if level:
        qs = qs.filter(level=level)
    if q:
        qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))
    return qs.order_by("track", "level", "title")


def get_job_role_by_id(role_id: uuid.UUID) -> JobRole:
    try:
        return (
            JobRole.objects.select_related("department")
            .prefetch_related("role_skills__skill", "career_steps_from__to_role", "career_steps_to")
            .get(pk=role_id)
        )
    except JobRole.DoesNotExist:
        raise NotFound(message="Job role not found.")
