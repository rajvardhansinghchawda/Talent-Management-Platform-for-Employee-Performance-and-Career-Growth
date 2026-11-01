"""Selectors for Goals, Review Cycles, Updates, and Alignment."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from django.db.models import Q, QuerySet

from apps.core.exceptions import DomainException
from apps.employees.models import Employee
from apps.employees.selectors import get_employee_by_id, get_employee_for_user, reports_to_tree
from apps.performance.models import (
    Goal,
    GoalComment,
    GoalStatus,
    GoalUpdate,
    ReviewCycle,
)

if TYPE_CHECKING:
    from apps.accounts.models import User


def get_active_review_cycle() -> ReviewCycle | None:
    return ReviewCycle.objects.filter(status="ACTIVE").first()


def list_review_cycles(
    mine: bool = False, employee: Employee | None = None
) -> QuerySet[ReviewCycle]:
    qs = ReviewCycle.objects.all().order_by("-start_date")
    if mine and employee and employee.department:
        qs = qs.filter(Q(departments=employee.department) | Q(departments__isnull=True)).distinct()
    return qs


def get_goal_by_id(goal_id: uuid.UUID | str) -> Goal | None:
    return (
        Goal.objects.select_related("owner", "owner__user", "owner__job_role", "cycle", "parent")
        .filter(id=goal_id)
        .first()
    )


def list_goals(
    actor: User,
    scope: str | None = None,
    employee_param: str | None = None,
    cycle_id: str | None = None,
    status: str | None = None,
    for_parent: bool = False,
    q: str | None = None,
    ordering: str | None = None,
) -> QuerySet[Goal]:
    """
    List goals with role-based scoping and query filters.
    - Employee: Only own goals.
    - Manager: Own goals or reporting tree (scope=team or employee=<id>).
    - HR/Executive: Organization-wide.
    """
    actor_emp = get_employee_for_user(actor)

    qs = Goal.objects.select_related(
        "owner", "owner__user", "owner__job_role", "cycle", "parent"
    ).all()

    # Apply role scoping
    if actor.role == "EMPLOYEE":
        if not actor_emp:
            return Goal.objects.none()
        if employee_param and employee_param != "me" and str(actor_emp.id) != employee_param:
            raise DomainException("Employee not found.", code="not_found", status_code=404)
        qs = qs.filter(owner=actor_emp)

    elif actor.role == "MANAGER":
        if scope == "team":
            if not actor_emp:
                return Goal.objects.none()
            subordinates = list(reports_to_tree(actor_emp, include_self=False))
            if employee_param and employee_param != "me":
                target = get_employee_by_id(employee_param)
                if not target or target not in subordinates:
                    raise DomainException("Employee not found.", code="not_found", status_code=404)
                qs = qs.filter(owner=target)
            else:
                qs = qs.filter(owner__in=subordinates)
        elif employee_param:
            if employee_param == "me":
                qs = qs.filter(owner=actor_emp)
            else:
                if not actor_emp:
                    raise DomainException("Employee not found.", code="not_found", status_code=404)
                target = get_employee_by_id(employee_param)
                subordinates_with_self = set(reports_to_tree(actor_emp, include_self=True))
                if not target or target not in subordinates_with_self:
                    raise DomainException("Employee not found.", code="not_found", status_code=404)
                qs = qs.filter(owner=target)
        else:
            if actor_emp:
                qs = qs.filter(owner=actor_emp)
            else:
                return Goal.objects.none()

    elif actor.role in ("HR_ADMIN", "EXECUTIVE"):
        if employee_param:
            if employee_param == "me":
                if actor_emp:
                    qs = qs.filter(owner=actor_emp)
                else:
                    return Goal.objects.none()
            else:
                target = get_employee_by_id(employee_param)
                if not target:
                    raise DomainException("Employee not found.", code="not_found", status_code=404)
                qs = qs.filter(owner=target)

    # Extra filters
    if cycle_id:
        qs = qs.filter(cycle_id=cycle_id)

    if status:
        qs = qs.filter(status=status)

    if for_parent:
        qs = qs.filter(status=GoalStatus.ACTIVE)

    if q:
        query = q.strip()
        qs = qs.filter(Q(title__icontains=query) | Q(description__icontains=query))

    if ordering:
        valid_orderings = [
            "title",
            "-title",
            "due_date",
            "-due_date",
            "created_at",
            "-created_at",
            "weight",
            "-weight",
            "status",
            "-status",
        ]
        if ordering in valid_orderings:
            qs = qs.order_by(ordering)
    else:
        qs = qs.order_by("-created_at")

    return qs


def list_goal_updates(goal: Goal) -> QuerySet[GoalUpdate]:
    return goal.updates.select_related("author").order_by("created_at")


def list_goal_comments(goal: Goal) -> QuerySet[GoalComment]:
    return goal.comments.select_related("author").order_by("created_at")


def get_alignment_forest(
    actor: User, scope: str | None = None, cycle_id: str | None = None
) -> list:
    """Return a hierarchy tree of active goals rooted at top-level company/department goals."""
    goals_qs = list_goals(actor=actor, scope=scope, cycle_id=cycle_id)

    goals_by_id = {str(g.id): g for g in goals_qs}
    children_map: dict[str, list] = {}

    roots = []
    for g in goals_qs:
        pid = str(g.parent_id) if g.parent_id else None
        if not pid or pid not in goals_by_id:
            roots.append(g)
        else:
            children_map.setdefault(pid, []).append(g)

    def build_node(goal: Goal) -> dict:
        gid = str(goal.id)
        return {
            "id": gid,
            "title": goal.title,
            "goal_type": goal.goal_type,
            "status": goal.status,
            "progress_pct": goal.progress_pct,
            "owner": {"id": str(goal.owner.id), "name": goal.owner.name},
            "children": [build_node(child) for child in children_map.get(gid, [])],
        }

    return [build_node(root) for root in roots]
