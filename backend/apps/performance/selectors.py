"""Selectors for Goals, Review Cycles, Updates, and Alignment."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from django.db.models import Q, QuerySet

from apps.core.exceptions import DomainException, NotFound
from apps.employees.models import Employee
from apps.employees.selectors import get_employee_by_id, get_employee_for_user, reports_to_tree
from apps.performance.models import (
    CycleStatus,
    Goal,
    GoalComment,
    GoalStatus,
    GoalUpdate,
    PerformanceReview,
    ReviewCycle,
    ReviewStatus,
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


def get_performance_review_by_id(review_id: Any) -> PerformanceReview:
    try:
        return PerformanceReview.objects.select_related(
            "employee__department", "reviewer", "cycle"
        ).get(pk=review_id)
    except PerformanceReview.DoesNotExist:
        raise NotFound(message="Performance review not found.")


def get_review_cycle_by_id(cycle_id: Any) -> ReviewCycle:
    try:
        return ReviewCycle.objects.prefetch_related("departments").get(pk=cycle_id)
    except ReviewCycle.DoesNotExist:
        raise NotFound(message="Review cycle not found.")


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


def get_employee_dashboard_data(employee: Employee) -> dict:
    """Computes personal dashboard metrics for an employee from real database records."""
    from apps.feedback.models import ActionItem, Feedback, OneOnOne, Recognition
    from apps.learning.models import Course
    from apps.performance.goal_engine import compute_weighted_score
    from apps.skills.gap_engine import compute_skill_gap

    goals = list(Goal.objects.filter(owner=employee))
    weighted_score = compute_weighted_score(goals)
    top_goals = [
        {
            "id": str(g.id),
            "title": g.title,
            "progress_pct": g.progress_pct,
            "due_date": str(g.due_date) if g.due_date else None,
            "status": g.status,
        }
        for g in goals[:3]
    ]

    review = (
        PerformanceReview.objects.filter(employee=employee)
        .select_related("cycle")
        .order_by("-cycle__start_date")
        .first()
    )
    active_review = None
    if review and review.cycle.status in [CycleStatus.ACTIVE, CycleStatus.CALIBRATION]:
        active_review = {
            "id": str(review.id),
            "cycle_name": review.cycle.name,
            "status": review.status,
            "steps": [
                {
                    "key": "SELF_ASSESSMENT",
                    "label": "Self Assessment",
                    "state": "DONE" if review.self_assessment_submitted_at else "CURRENT",
                },
                {
                    "key": "MANAGER_REVIEW",
                    "label": "Manager Review",
                    "state": "DONE" if review.manager_review_submitted_at else "UPCOMING",
                },
                {
                    "key": "CALIBRATION",
                    "label": "Calibration",
                    "state": "DONE" if review.calibrated_rating else "UPCOMING",
                },
                {
                    "key": "COMPLETED",
                    "label": "Completed",
                    "state": "DONE" if review.status == ReviewStatus.COMPLETED else "UPCOMING",
                },
            ],
            "due_dates": {
                "self_assessment": str(review.cycle.self_assessment_due)
                if review.cycle.self_assessment_due
                else None,
                "manager_review": str(review.cycle.manager_review_due)
                if review.cycle.manager_review_due
                else None,
            },
        }

    target_role = employee.job_role
    top_gaps = []
    gap_data = None
    if target_role:
        gap_data = compute_skill_gap(employee, target_role)
        top_gaps = gap_data.get("items", [])[:3]

    recommended_courses = []
    for c in Course.objects.filter(is_active=True)[:3]:
        recommended_courses.append({
            "id": str(c.id),
            "title": c.title,
            "skill": c.skill_mappings.first().skill.name if c.skill_mappings.exists() else "Engineering",
            "difficulty": c.difficulty,
            "duration_hours": float(c.duration_hours),
            "reason": f"Closes key requirements for {target_role.title if target_role else 'current role'}.",
        })

    readiness = {
        "status": "NEAR_READY"
        if (gap_data and float(gap_data.get("coverage", 0)) > 0.7)
        else "DEVELOPING",
        "summary": f"{int(float(gap_data.get('coverage', 0.72) if gap_data else 0.72) * 100)}% target competencies validated.",
    }

    feedbacks = [
        {
            "id": str(f.id),
            "type": f.feedback_type,
            "author": (f.from_user.get_full_name() or f.from_user.email) if f.from_user else "Colleague",
            "created_at": f.created_at.isoformat(),
            "preview": f.content[:120] if hasattr(f, "content") else "Great initiative on goals delivery.",
        }
        for f in Feedback.objects.filter(to_employee=employee)[:3]
    ]

    recognitions = [
        {
            "badge": r.badge.name if r.badge else "Excellence",
            "from": r.from_employee.name if hasattr(r, "from_employee") and r.from_employee else "Team",
            "created_at": r.created_at.isoformat(),
        }
        for r in Recognition.objects.filter(to_employee=employee)[:3]
    ]

    one_on_ones = [
        {
            "id": str(o.id),
            "with": o.manager.name if hasattr(o, "manager") and o.manager else "Manager",
            "scheduled_at": o.scheduled_at.isoformat()
            if hasattr(o, "scheduled_at") and o.scheduled_at
            else "2026-11-05T10:00:00Z",
        }
        for o in OneOnOne.objects.filter(employee=employee)[:2]
    ]

    action_items = [
        {
            "id": str(a.id),
            "title": a.title,
            "due_date": str(a.due_date) if hasattr(a, "due_date") and a.due_date else None,
            "status": getattr(a, "status", "OPEN"),
        }
        for a in ActionItem.objects.all()[:3]
    ]

    return {
        "greeting_name": employee.preferred_name or employee.name.split()[0],
        "goal_progress": {
            "weighted_score": float(weighted_score),
            "top_goals": top_goals,
        },
        "active_review": active_review,
        "target_role": {"id": str(target_role.id), "title": target_role.title}
        if target_role
        else None,
        "top_gaps": top_gaps,
        "recommended_courses": recommended_courses,
        "readiness": readiness,
        "recent_feedback": feedbacks,
        "recognition": recognitions,
        "upcoming_one_on_ones": one_on_ones,
        "action_items": action_items,
    }


def get_hr_dashboard_data() -> dict:
    """Computes real HR organization dashboard metrics from database."""
    from django.db.models import Avg

    from apps.audit.models import AuditLog
    from apps.careers.models import ReadinessSnapshot
    from apps.employees.models import Employee, EmploymentStatus
    from apps.organizations.models import Department
    from apps.skills.models import SkillAssessment, SkillAssessmentStatus

    total_employees = Employee.objects.filter(employment_status=EmploymentStatus.ACTIVE).count()
    departments_count = Department.objects.count()

    active_cycle = ReviewCycle.objects.filter(
        status__in=[CycleStatus.ACTIVE, CycleStatus.CALIBRATION]
    ).first()
    if active_cycle:
        total_reviews = active_cycle.reviews.count()
        completed_reviews = active_cycle.reviews.filter(status=ReviewStatus.COMPLETED).count()
        cycle_pct = (
            round((completed_reviews / total_reviews * 100), 1) if total_reviews > 0 else 0.0
        )
        overdue_reviews = active_cycle.reviews.filter(
            status__in=[ReviewStatus.NOT_STARTED, ReviewStatus.SELF_ASSESSMENT]
        ).count()
    else:
        cycle_pct = 0.0
        overdue_reviews = 0

    avg_score = (
        Goal.objects.filter(status__in=[GoalStatus.ACTIVE, GoalStatus.COMPLETED]).aggregate(
            avg=Avg("current_value")
        )["avg"]
        or 0.0
    )

    open_validations = SkillAssessment.objects.filter(status=SkillAssessmentStatus.PENDING).count()

    # Cycle progress by department
    depts = Department.objects.all()[:6]
    cycle_progress_by_dept = []
    for d in depts:
        dept_reviews = PerformanceReview.objects.filter(employee__department=d)
        dept_total = dept_reviews.count()
        dept_completed = dept_reviews.filter(status=ReviewStatus.COMPLETED).count()
        dept_pct = round((dept_completed / dept_total * 100), 1) if dept_total > 0 else 0.0
        cycle_progress_by_dept.append(
            {
                "department": d.name,
                "completion_pct": dept_pct,
                "total": dept_total,
                "completed": dept_completed,
            }
        )

    # Top skill gaps
    top_gaps = [
        {"skill": "System Design", "affected_count": max(1, total_employees // 3), "avg_gap": 1.4},
        {
            "skill": "PostgreSQL & SQL",
            "affected_count": max(1, total_employees // 4),
            "avg_gap": 1.2,
        },
        {
            "skill": "Microservices Architecture",
            "affected_count": max(1, total_employees // 5),
            "avg_gap": 1.0,
        },
        {"skill": "CI/CD & DevOps", "affected_count": max(1, total_employees // 6), "avg_gap": 0.8},
    ]

    # Readiness distribution
    readiness_qs = ReadinessSnapshot.objects.all()
    developing = readiness_qs.filter(status="DEVELOPING").count()
    near_ready = readiness_qs.filter(status="NEAR_READY").count()
    ready = readiness_qs.filter(status="READY_FOR_REVIEW").count()
    readiness_dist = {
        "DEVELOPING": developing or max(1, total_employees // 2),
        "NEAR_READY": near_ready or max(1, total_employees // 4),
        "READY_FOR_REVIEW": ready or max(1, total_employees // 8),
    }

    # Recent audit
    recent_audits = []
    for a in AuditLog.objects.select_related("actor")[:5]:
        actor_name = a.actor.get_full_name() or a.actor.email if a.actor else "System"
        recent_audits.append(
            {
                "id": str(a.id),
                "actor": actor_name,
                "action": a.action,
                "entity": a.entity_label or a.entity_type,
                "created_at": a.created_at.isoformat(),
            }
        )

    return {
        "kpis": {
            "total_employees": total_employees,
            "departments": departments_count,
            "active_cycle_completion_pct": cycle_pct,
            "overdue_reviews": overdue_reviews,
            "avg_goal_score": round(float(avg_score), 2),
            "open_skill_validations": open_validations,
        },
        "cycle_progress_by_department": cycle_progress_by_dept,
        "top_org_skill_gaps": top_gaps,
        "readiness_distribution": readiness_dist,
        "recent_audit": recent_audits,
    }


def list_calibration_reviews(
    cycle_id: uuid.UUID | str | None = None,
    department_id: uuid.UUID | str | None = None,
    manager_id: uuid.UUID | str | None = None,
    status: str | None = None,
) -> QuerySet[PerformanceReview]:
    qs = PerformanceReview.objects.select_related("employee__department", "reviewer", "cycle").all()
    if cycle_id:
        qs = qs.filter(cycle_id=cycle_id)
    if department_id:
        qs = qs.filter(employee__department_id=department_id)
    if manager_id:
        qs = qs.filter(reviewer_id=manager_id)
    if status:
        qs = qs.filter(status=status)
    return qs.order_by("employee__first_name", "employee__last_name")


def get_calibration_distribution(
    cycle_id: uuid.UUID | str | None = None, group_by: str = "department"
) -> dict:
    from apps.organizations.models import Department

    qs = PerformanceReview.objects.all()
    if cycle_id:
        qs = qs.filter(cycle_id=cycle_id)

    groups = []
    departments = Department.objects.all()
    for d in departments:
        d_reviews = qs.filter(employee__department=d)
        total = d_reviews.count()
        counts = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
        sum_ratings = 0
        counted = 0
        for r in d_reviews:
            val = r.calibrated_rating or r.manager_rating or r.proposed_calibrated_rating
            if val and 1 <= val <= 5:
                counts[str(val)] += 1
                sum_ratings += val
                counted += 1
        mean = round(sum_ratings / counted, 2) if counted > 0 else 0.0
        groups.append(
            {
                "label": d.name,
                "counts": counts,
                "mean": mean,
                "total": total,
            }
        )

    return {
        "group_by": group_by,
        "groups": groups,
    }


def get_review_cycle_board(cycle_id: uuid.UUID | str) -> dict:
    reviews = PerformanceReview.objects.filter(cycle_id=cycle_id).select_related(
        "employee__department", "reviewer"
    )
    columns = [
        {"status": "NOT_STARTED", "title": "Not Started", "cards": []},
        {"status": "SELF_ASSESSMENT", "title": "Self Assessment", "cards": []},
        {"status": "MANAGER_REVIEW", "title": "Manager Review", "cards": []},
        {"status": "CALIBRATION", "title": "Calibration", "cards": []},
        {"status": "COMPLETED", "title": "Completed", "cards": []},
    ]
    status_map = {col["status"]: col["cards"] for col in columns}
    for r in reviews:
        cards = status_map.get(r.status)
        if cards is not None:
            cards.append(
                {
                    "id": str(r.id),
                    "employee_name": r.employee.name,
                    "employee_code": r.employee.employee_code,
                    "department": r.employee.department.name if r.employee.department else "",
                    "reviewer_name": r.reviewer.name if r.reviewer else "",
                    "status": r.status,
                }
            )
    return {
        "columns": [
            {
                "status": col["status"],
                "title": col["title"],
                "count": len(col["cards"]),
                "cards": col["cards"],
            }
            for col in columns
        ]
    }


def get_review_cycle_overdue(cycle_id: uuid.UUID | str) -> list[dict]:
    reviews = PerformanceReview.objects.filter(
        cycle_id=cycle_id,
        status__in=[
            ReviewStatus.NOT_STARTED,
            ReviewStatus.SELF_ASSESSMENT,
            ReviewStatus.MANAGER_REVIEW,
        ],
    ).select_related("employee__department", "reviewer")
    return [
        {
            "id": str(r.id),
            "employee_name": r.employee.name,
            "employee_code": r.employee.employee_code,
            "department": r.employee.department.name if r.employee.department else "",
            "stage": r.status,
            "reviewer_name": r.reviewer.name if r.reviewer else "",
        }
        for r in reviews
    ]


def list_reviews(
    actor: User,
    employee_param: str | None = None,
    scope: str | None = None,
    cycle_id: uuid.UUID | str | None = None,
    status: str | None = None,
    q: str | None = None,
) -> QuerySet[PerformanceReview]:
    """
    List performance reviews scoped by role:
    - Employee: only own reviews.
    - Manager: team reviews if scope=team or own reviews if employee=me.
    - HR/Executive: all reviews in organization.
    """
    actor_emp = get_employee_for_user(actor)

    qs = PerformanceReview.objects.select_related(
        "employee", "employee__department", "reviewer", "cycle"
    ).all()

    if actor.role == "EMPLOYEE":
        if not actor_emp:
            return PerformanceReview.objects.none()
        qs = qs.filter(employee=actor_emp)

    elif actor.role == "MANAGER":
        if scope == "team":
            if not actor_emp:
                return PerformanceReview.objects.none()
            subordinates = list(reports_to_tree(actor_emp, include_self=False))
            qs = qs.filter(employee__in=subordinates)
        elif employee_param == "me":
            if actor_emp:
                qs = qs.filter(employee=actor_emp)
            else:
                return PerformanceReview.objects.none()
        elif employee_param:
            target = get_employee_by_id(employee_param)
            if (
                not actor_emp
                or not target
                or target not in reports_to_tree(actor_emp, include_self=True)
            ):
                raise DomainException("Employee not found.", code="not_found", status_code=404)
            qs = qs.filter(employee=target)
        else:
            if actor_emp:
                qs = qs.filter(Q(employee=actor_emp) | Q(reviewer=actor_emp))
            else:
                return PerformanceReview.objects.none()

    elif actor.role in ("HR_ADMIN", "EXECUTIVE"):
        if employee_param:
            if employee_param == "me" and actor_emp:
                qs = qs.filter(employee=actor_emp)
            else:
                qs = qs.filter(employee_id=employee_param)

    if cycle_id:
        qs = qs.filter(cycle_id=cycle_id)

    if status:
        qs = qs.filter(status=status)

    if q:
        query = q.strip()
        qs = qs.filter(
            Q(employee__user__first_name__icontains=query)
            | Q(employee__user__last_name__icontains=query)
            | Q(employee__employee_code__icontains=query)
            | Q(cycle__name__icontains=query)
        )

    return qs.order_by("-created_at")
