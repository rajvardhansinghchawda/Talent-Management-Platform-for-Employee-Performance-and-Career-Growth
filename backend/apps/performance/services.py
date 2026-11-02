"""Domain services for Goals and KPI tracking."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from django.db import transaction
from django.utils import timezone

from apps.audit.services import log as audit_log
from apps.core.exceptions import DomainException
from apps.employees.models import Employee
from apps.employees.selectors import get_employee_by_id, get_employee_for_user, reports_to_tree
from apps.notifications.models import NotificationCategory
from apps.notifications.services import notify
from apps.organizations.selectors import get_organization
from apps.performance.goal_engine import (
    compute_goal_score,
    compute_progress_pct,
    compute_weighted_score,
)
from apps.performance.models import (
    CycleStatus,
    Goal,
    GoalComment,
    GoalDirection,
    GoalStatus,
    GoalType,
    GoalUpdate,
    PerformanceReview,
    ReviewCalibrationEntry,
    ReviewCompetencyRating,
    ReviewCycle,
    ReviewStatus,
)

if TYPE_CHECKING:
    from apps.accounts.models import User


def get_goal_score_cap() -> Decimal:
    """Retrieve organization-configured goal score cap (default 1.0, max 1.5)."""
    org = get_organization()
    if org and org.settings_performance:
        cap_val = org.settings_performance.get("goal_score_cap")
        if cap_val is not None:
            return Decimal(str(cap_val))
    return Decimal("1.0")


def validate_no_goal_cycle(
    goal_id: uuid.UUID | str | None, parent_id: uuid.UUID | str | None
) -> None:
    """Ensure parent assignment does not create circular references in goals."""
    if not parent_id:
        return

    parent_id_str = str(parent_id)
    if goal_id and str(goal_id) == parent_id_str:
        raise DomainException(
            "A goal cannot be its own parent.",
            code="state_conflict",
            status_code=409,
            details={"reason": "CYCLE_DETECTED"},
        )

    visited = set()
    current_id = parent_id_str

    while current_id:
        if goal_id and current_id == str(goal_id):
            raise DomainException(
                "Goal parent assignment creates a circular reference.",
                code="state_conflict",
                status_code=409,
                details={"reason": "CYCLE_DETECTED"},
            )
        if current_id in visited:
            raise DomainException(
                "Circular reference detected in existing goal parent chain.",
                code="state_conflict",
                status_code=409,
                details={"reason": "CYCLE_DETECTED"},
            )
        visited.add(current_id)

        parent_goal = Goal.objects.filter(id=current_id).values_list("parent_id", flat=True).first()
        current_id = str(parent_goal) if parent_goal else None


@transaction.atomic
def create_goal(data: dict, actor: User, request=None) -> Goal:
    """
    Create a goal.
    - If actor is EMPLOYEE: Owner is current user's employee, status is DRAFT.
    - If actor is MANAGER/HR: Can assign to a subordinate employee, status is ACTIVE.
    """
    actor_emp = get_employee_for_user(actor)

    target_emp_id = data.get("employee")
    if target_emp_id and actor.role in ("MANAGER", "HR_ADMIN", "EXECUTIVE"):
        owner = get_employee_by_id(target_emp_id)
        if not owner:
            raise DomainException("Target employee not found.", code="not_found", status_code=404)

        if actor.role == "MANAGER":
            if not actor_emp:
                raise DomainException(
                    "Manager profile not found.", code="not_found", status_code=404
                )
            allowed_subordinates = set(reports_to_tree(actor_emp, include_self=True))
            if owner not in allowed_subordinates:
                raise DomainException(
                    "Employee not found or outside your reporting tree.",
                    code="not_found",
                    status_code=404,
                )

        status = GoalStatus.ACTIVE
    else:
        if not actor_emp:
            raise DomainException("Employee profile not found.", code="not_found", status_code=404)
        owner = actor_emp
        status = GoalStatus.DRAFT

    cycle = None
    if data.get("cycle"):
        cycle = ReviewCycle.objects.filter(id=data["cycle"]).first()
        if not cycle:
            raise DomainException("Review cycle not found.", code="not_found", status_code=404)

    parent = None
    if data.get("parent"):
        parent = Goal.objects.filter(id=data["parent"]).first()
        if not parent:
            raise DomainException("Parent goal not found.", code="not_found", status_code=404)
        validate_no_goal_cycle(None, parent.id)

    start_val = data.get("start_value", Decimal("0"))
    target_val = data.get("target_value", Decimal("100"))

    goal = Goal.objects.create(
        owner=owner,
        cycle=cycle,
        parent=parent,
        title=data["title"],
        description=data.get("description", ""),
        goal_type=data.get("goal_type", GoalType.KPI),
        metric_unit=data.get("metric_unit", ""),
        start_value=start_val,
        target_value=target_val,
        current_value=start_val,
        direction=data.get("direction", GoalDirection.HIGHER_BETTER),
        weight=data.get("weight", Decimal("1.0")),
        due_date=data.get("due_date"),
        status=status,
    )

    audit_log(
        actor=actor,
        action="GOAL_CREATED",
        entity_type="goal",
        entity_id=str(goal.id),
        entity_label=goal.title,
        after={"status": goal.status, "owner_id": str(owner.id), "title": goal.title},
    )

    if status == GoalStatus.ACTIVE and owner.user and owner.user != actor:
        notify(
            owner.user,
            NotificationCategory.GOAL_DECISION,
            title=f"New Goal Assigned: {goal.title}",
            body=f"{actor.get_full_name() or 'Your manager'} assigned a new goal to you: '{goal.title}'.",
            link=f"/employee/goals/{goal.id}",
        )

    return goal


@transaction.atomic
def update_goal(goal: Goal, data: dict, actor: User) -> Goal:
    """Update goal attributes respecting status lock rules."""
    if goal.is_locked:
        raise DomainException(
            "Cannot edit goal while pending approval.",
            code="state_conflict",
            status_code=409,
            details={"reason": "GOAL_LOCKED"},
        )

    if goal.status in (GoalStatus.COMPLETED, GoalStatus.CANCELLED):
        raise DomainException(
            f"Cannot edit goal in status {goal.status}.",
            code="state_conflict",
            status_code=409,
        )

    before_snapshot = {
        "title": goal.title,
        "weight": str(goal.weight),
        "target_value": str(goal.target_value),
        "current_value": str(goal.current_value),
        "status": goal.status,
    }

    if "parent" in data:
        parent_id = data["parent"]
        if parent_id:
            validate_no_goal_cycle(goal.id, parent_id)
            parent = Goal.objects.filter(id=parent_id).first()
            if not parent:
                raise DomainException("Parent goal not found.", code="not_found", status_code=404)
            goal.parent = parent
        else:
            goal.parent = None

    if "cycle" in data:
        cycle_id = data["cycle"]
        if cycle_id:
            cycle = ReviewCycle.objects.filter(id=cycle_id).first()
            if not cycle:
                raise DomainException("Review cycle not found.", code="not_found", status_code=404)
            goal.cycle = cycle
        else:
            goal.cycle = None

    for field in (
        "title",
        "description",
        "goal_type",
        "metric_unit",
        "start_value",
        "target_value",
        "direction",
        "weight",
        "due_date",
    ):
        if field in data and data[field] is not None:
            setattr(goal, field, data[field])

    goal.save()

    audit_log(
        actor=actor,
        action="GOAL_UPDATED",
        entity_type="goal",
        entity_id=str(goal.id),
        entity_label=goal.title,
        before=before_snapshot,
        after={
            "title": goal.title,
            "weight": str(goal.weight),
            "target_value": str(goal.target_value),
            "current_value": str(goal.current_value),
            "status": goal.status,
        },
    )

    return goal


@transaction.atomic
def submit_goal_for_approval(goal: Goal, actor: User) -> Goal:
    """Submit a DRAFT goal for manager approval."""
    if goal.status != GoalStatus.DRAFT:
        raise DomainException(
            f"Cannot submit goal in status {goal.status}.",
            code="state_conflict",
            status_code=409,
        )

    if goal.owner.user_id != actor.id and actor.role != "HR_ADMIN":
        raise DomainException(
            "Only the goal owner can submit for approval.",
            code="forbidden",
            status_code=403,
        )

    if goal.target_value == goal.start_value:
        raise DomainException(
            "Target value cannot equal start value.",
            code="validation_error",
            status_code=400,
            details={"target_value": ["Target value cannot equal start value."]},
        )

    if goal.weight <= Decimal("0"):
        raise DomainException(
            "Goal weight must be greater than zero.",
            code="validation_error",
            status_code=400,
            details={"weight": ["Goal weight must be greater than zero."]},
        )

    goal.status = GoalStatus.PENDING_APPROVAL
    goal.submitted_at = timezone.now()
    goal.save(update_fields=["status", "submitted_at", "updated_at"])

    # Notify direct manager if present
    manager = goal.owner.manager
    if manager and manager.user:
        notify(
            manager.user,
            NotificationCategory.GOAL_APPROVAL_NEEDED,
            title=f"Goal Approval Needed: {goal.title}",
            body=f"{goal.owner.name} submitted goal '{goal.title}' for approval.",
            link="/manager/goals",
        )

    audit_log(
        actor=actor,
        action="GOAL_SUBMITTED",
        entity_type="goal",
        entity_id=str(goal.id),
        entity_label=goal.title,
        after={"status": goal.status, "submitted_at": str(goal.submitted_at)},
    )

    return goal


@transaction.atomic
def approve_goal(goal: Goal, actor: User, comment: str = "") -> Goal:
    """Approve a pending goal and move it to ACTIVE."""
    if goal.status != GoalStatus.PENDING_APPROVAL:
        raise DomainException(
            f"Only goals pending approval can be approved (current: {goal.status}).",
            code="state_conflict",
            status_code=409,
        )

    # Prevent self-approval
    if goal.owner.user_id == actor.id:
        raise DomainException(
            "You cannot approve your own goal.",
            code="forbidden",
            status_code=403,
        )

    # If actor is manager, ensure employee is in their hierarchy
    if actor.role == "MANAGER":
        actor_emp = get_employee_for_user(actor)
        if not actor_emp or goal.owner not in set(reports_to_tree(actor_emp, include_self=True)):
            raise DomainException(
                "You can only approve goals for employees in your reporting tree.",
                code="forbidden",
                status_code=403,
            )

    goal.status = GoalStatus.ACTIVE
    goal.save(update_fields=["status", "updated_at"])

    if comment and comment.strip():
        GoalComment.objects.create(
            goal=goal,
            author=actor,
            kind=GoalComment.Kind.APPROVAL,
            text=comment.strip(),
        )

    if goal.owner.user:
        notify(
            goal.owner.user,
            NotificationCategory.GOAL_DECISION,
            title=f"Goal Approved: {goal.title}",
            body=f"Your goal '{goal.title}' has been approved.",
            link=f"/employee/goals/{goal.id}",
        )

    audit_log(
        actor=actor,
        action="GOAL_APPROVED",
        entity_type="goal",
        entity_id=str(goal.id),
        entity_label=goal.title,
        after={"status": goal.status, "approved_by": actor.email},
    )

    return goal


@transaction.atomic
def reject_goal(goal: Goal, actor: User, comment: str) -> Goal:
    """Reject a pending goal with mandatory feedback and return it to DRAFT."""
    if not comment or not comment.strip():
        raise DomainException(
            "Rejection comment is required.",
            code="validation_error",
            status_code=400,
            details={"comment": ["A comment is required when rejecting a goal."]},
        )

    if goal.status != GoalStatus.PENDING_APPROVAL:
        raise DomainException(
            f"Only goals pending approval can be rejected (current: {goal.status}).",
            code="state_conflict",
            status_code=409,
        )

    if goal.owner.user_id == actor.id:
        raise DomainException(
            "You cannot reject your own goal.",
            code="forbidden",
            status_code=403,
        )

    if actor.role == "MANAGER":
        actor_emp = get_employee_for_user(actor)
        if not actor_emp or goal.owner not in set(reports_to_tree(actor_emp, include_self=True)):
            raise DomainException(
                "You can only reject goals for employees in your reporting tree.",
                code="forbidden",
                status_code=403,
            )

    goal.status = GoalStatus.DRAFT
    goal.save(update_fields=["status", "updated_at"])

    GoalComment.objects.create(
        goal=goal,
        author=actor,
        kind=GoalComment.Kind.REJECTION,
        text=comment.strip(),
    )

    if goal.owner.user:
        notify(
            goal.owner.user,
            NotificationCategory.GOAL_DECISION,
            title=f"Goal Returned to Draft: {goal.title}",
            body=f"Your goal '{goal.title}' was returned to draft: {comment.strip()}",
            link=f"/employee/goals/{goal.id}",
        )

    audit_log(
        actor=actor,
        action="GOAL_REJECTED",
        entity_type="goal",
        entity_id=str(goal.id),
        entity_label=goal.title,
        after={"status": goal.status, "reason": comment.strip()},
    )

    return goal


@transaction.atomic
def add_goal_progress_update(
    goal: Goal, actor: User, value: Decimal, note: str = "", evidence_url: str = ""
) -> GoalUpdate:
    """Record an append-only progress update on an ACTIVE goal."""
    if goal.status != GoalStatus.ACTIVE:
        raise DomainException(
            f"Progress updates are only allowed on ACTIVE goals (current status: {goal.status}).",
            code="state_conflict",
            status_code=409,
        )

    actor_emp = get_employee_for_user(actor) or goal.owner

    goal.current_value = value
    goal.save(update_fields=["current_value", "updated_at"])

    update = GoalUpdate.objects.create(
        goal=goal,
        author=actor_emp,
        value=value,
        note=note.strip() if note else "",
        evidence_url=evidence_url.strip() if evidence_url else "",
    )

    audit_log(
        actor=actor,
        action="GOAL_PROGRESS_UPDATED",
        entity_type="goal",
        entity_id=str(goal.id),
        entity_label=goal.title,
        after={"current_value": str(value), "update_id": str(update.id)},
    )

    return update


@transaction.atomic
def complete_goal(goal: Goal, actor: User, note: str = "") -> Goal:
    """Mark an ACTIVE goal as COMPLETED; requires a note if target was not met."""
    if goal.status != GoalStatus.ACTIVE:
        raise DomainException(
            f"Only ACTIVE goals can be marked complete (current: {goal.status}).",
            code="state_conflict",
            status_code=409,
        )

    progress_pct = compute_progress_pct(goal)
    if progress_pct < Decimal("100") and not (note and note.strip()):
        raise DomainException(
            "Completion note is required when target is not met.",
            code="validation_error",
            status_code=400,
            details={"note": ["A completion note is required when target is not met."]},
        )

    goal.status = GoalStatus.COMPLETED
    goal.completed_at = timezone.now()
    goal.completion_note = note.strip() if note else ""
    goal.save(update_fields=["status", "completed_at", "completion_note", "updated_at"])

    audit_log(
        actor=actor,
        action="GOAL_COMPLETED",
        entity_type="goal",
        entity_id=str(goal.id),
        entity_label=goal.title,
        after={"status": goal.status, "completion_note": goal.completion_note},
    )

    return goal


def get_goal_alignment(goal: Goal) -> dict:
    """Return ancestor hierarchy, the goal itself, and immediate children."""
    ancestors = []
    curr = goal.parent
    while curr:
        ancestors.append(
            {
                "id": str(curr.id),
                "title": curr.title,
                "status": curr.status,
                "owner": {"id": str(curr.owner.id), "name": curr.owner.name},
            }
        )
        curr = curr.parent
    ancestors.reverse()

    children = [
        {
            "id": str(c.id),
            "title": c.title,
            "status": c.status,
            "owner": {"id": str(c.owner.id), "name": c.owner.name},
            "progress_pct": c.progress_pct,
        }
        for c in goal.children.select_related("owner").all()
    ]

    return {
        "ancestors": ancestors,
        "goal": {
            "id": str(goal.id),
            "title": goal.title,
            "status": goal.status,
            "progress_pct": goal.progress_pct,
            "owner": {"id": str(goal.owner.id), "name": goal.owner.name},
        },
        "children": children,
    }


def get_employee_goals_score(employee: Employee, cycle_id: uuid.UUID | str | None = None) -> dict:
    """Compute weighted goal score with per-goal breakdown and org cap applied."""
    qs = Goal.objects.filter(owner=employee)
    if cycle_id:
        cycle_qs = qs.filter(cycle_id=cycle_id)
        if cycle_qs.exists():
            qs = cycle_qs
        else:
            qs = qs.filter(cycle__isnull=True)

    goals = list(qs)
    cap = get_goal_score_cap()

    eligible = [g for g in goals if g.status in (GoalStatus.ACTIVE, GoalStatus.COMPLETED)]
    total_weight = sum(Decimal(str(g.weight)) for g in eligible)

    breakdown = []
    for g in goals:
        score = compute_goal_score(g, cap=cap)
        pct = compute_progress_pct(g)
        weight = Decimal(str(g.weight))

        if total_weight > Decimal("0") and g.status in (GoalStatus.ACTIVE, GoalStatus.COMPLETED):
            contribution = (weight * score / total_weight).quantize(Decimal("0.0001"))
        else:
            contribution = Decimal("0.0000")

        breakdown.append(
            {
                "id": g.id,
                "title": g.title,
                "weight": weight,
                "progress_pct": pct,
                "score": score,
                "weighted_contribution": contribution,
                "status": g.status,
            }
        )

    weighted = compute_weighted_score(goals, cap=cap)
    weight_sum_warning = (
        len(eligible) > 0 and total_weight != Decimal("100") and total_weight != Decimal("1.0")
    )

    return {
        "employee_id": employee.id,
        "cycle_id": uuid.UUID(str(cycle_id)) if cycle_id else None,
        "weighted_score": weighted,
        "total_weight": total_weight,
        "cap": cap,
        "weight_sum_warning": weight_sum_warning,
        "goals": breakdown,
    }


# ─── Review State Machine & Services ──────────────────────────────────────────

VALID_REVIEW_TRANSITIONS: dict[str, list[str]] = {
    ReviewStatus.NOT_STARTED: [ReviewStatus.SELF_ASSESSMENT],
    ReviewStatus.SELF_ASSESSMENT: [ReviewStatus.MANAGER_REVIEW],
    ReviewStatus.MANAGER_REVIEW: [ReviewStatus.CALIBRATION],
    ReviewStatus.CALIBRATION: [ReviewStatus.COMPLETED],
    ReviewStatus.COMPLETED: [ReviewStatus.ACKNOWLEDGED, ReviewStatus.DISPUTED],
    ReviewStatus.DISPUTED: [ReviewStatus.CALIBRATION],
    ReviewStatus.ACKNOWLEDGED: [],  # Terminal
}


def get_rating_scale_bounds() -> tuple[int, int]:
    """Return (min_rating, max_rating) from org performance settings, defaulting to (1, 5)."""
    org = get_organization()
    if org and org.settings_performance:
        scale = org.settings_performance.get("rating_scale")
        if scale and isinstance(scale, list):
            values = [int(item["value"]) for item in scale if "value" in item]
            if values:
                return min(values), max(values)
    return 1, 5


def validate_rating_in_bounds(rating: int | None, field_name: str = "rating") -> None:
    """Validate that rating is within the configured rating scale."""
    if rating is None:
        return
    min_val, max_val = get_rating_scale_bounds()
    if rating < min_val or rating > max_val:
        raise DomainException(
            f"{field_name.capitalize()} must be between {min_val} and {max_val}.",
            code="validation_error",
            status_code=400,
            details={field_name: [f"Rating must be between {min_val} and {max_val}."]},
        )


@transaction.atomic
def transition_review(
    review: PerformanceReview,
    to_status: str,
    actor: User,
    data: dict | None = None,
) -> PerformanceReview:
    """
    Explicit state machine for PerformanceReview transitions.
    Enforces role restrictions, rating bounds, snapshotting, and audit trails.
    """
    data = data or {}
    from_status = review.status

    allowed_targets = VALID_REVIEW_TRANSITIONS.get(from_status, [])
    if to_status not in allowed_targets:
        raise DomainException(
            f"Invalid review transition from '{from_status}' to '{to_status}'.",
            code="state_conflict",
            status_code=409,
            details={"reason": "INVALID_TRANSITION", "from": from_status, "to": to_status},
        )

    # 1. NOT_STARTED -> SELF_ASSESSMENT
    if from_status == ReviewStatus.NOT_STARTED and to_status == ReviewStatus.SELF_ASSESSMENT:
        pass  # Typically triggered during cycle activation

    # 2. SELF_ASSESSMENT -> MANAGER_REVIEW
    elif from_status == ReviewStatus.SELF_ASSESSMENT and to_status == ReviewStatus.MANAGER_REVIEW:
        if review.employee.user_id != actor.id and actor.role != "HR_ADMIN":
            raise DomainException(
                "Only the employee being reviewed can submit self-assessment.",
                code="forbidden",
                status_code=403,
            )

        self_rating = data.get("self_rating", review.self_rating)
        validate_rating_in_bounds(self_rating, "self_rating")

        review.self_rating = self_rating
        review.self_comments = data.get("self_comments", review.self_comments)
        review.self_assessment_submitted_at = timezone.now()

        # Save competencies if provided
        for comp in data.get("competencies", []):
            c_name = comp.get("name") or comp.get("competency_name")
            if c_name:
                ReviewCompetencyRating.objects.update_or_create(
                    review=review,
                    competency_name=c_name,
                    defaults={
                        "self_rating": comp.get("self_rating") or comp.get("rating"),
                        "comment": comp.get("comment", ""),
                    },
                )

        # Notify manager
        if review.reviewer and review.reviewer.user:
            notify(
                user=review.reviewer.user,
                category=NotificationCategory.REVIEW_DUE,
                title=f"Manager Review Due: {review.employee.name}",
                body=f"{review.employee.name} has submitted their self-assessment for {review.cycle.name}.",
                link=f"/manager/reviews/{review.id}",
            )

    # 3. MANAGER_REVIEW -> CALIBRATION
    elif from_status == ReviewStatus.MANAGER_REVIEW and to_status == ReviewStatus.CALIBRATION:
        is_reviewer = review.reviewer and review.reviewer.user_id == actor.id
        if not is_reviewer and actor.role != "HR_ADMIN":
            raise DomainException(
                "Only the assigned reviewer can submit the manager review.",
                code="forbidden",
                status_code=403,
            )

        mgr_rating = data.get("manager_rating", review.manager_rating)
        validate_rating_in_bounds(mgr_rating, "manager_rating")

        review.manager_rating = mgr_rating
        review.manager_comments = data.get("manager_comments", review.manager_comments)
        review.manager_review_submitted_at = timezone.now()

        if "development_recommendations" in data:
            review.development_recommendations = data["development_recommendations"]

        # Save competencies manager ratings
        for comp in data.get("competencies", []):
            c_name = comp.get("name") or comp.get("competency_name")
            if c_name:
                ReviewCompetencyRating.objects.update_or_create(
                    review=review,
                    competency_name=c_name,
                    defaults={
                        "manager_rating": comp.get("manager_rating") or comp.get("rating"),
                    },
                )

        # Snapshot goal score at time of manager submit
        goal_summary = get_employee_goals_score(review.employee, cycle_id=review.cycle_id)
        review.goal_score_snapshot = goal_summary["weighted_score"]

    # 4. CALIBRATION -> COMPLETED
    elif from_status == ReviewStatus.CALIBRATION and to_status == ReviewStatus.COMPLETED:
        if actor.role != "HR_ADMIN":
            raise DomainException(
                "Only HR Admins can finalize calibration and approve final ratings.",
                code="forbidden",
                status_code=403,
            )

        rating = (
            data.get("final_rating") or review.proposed_calibrated_rating or review.manager_rating
        )
        validate_rating_in_bounds(rating, "final_rating")
        if not rating:
            raise DomainException(
                "A rating is required to finalize the review.",
                code="validation_error",
                status_code=400,
            )

        review.calibrated_rating = rating
        review.final_rating = rating

        comment = data.get("comment", "")
        if comment:
            ReviewCalibrationEntry.objects.create(
                review=review,
                actor=actor,
                from_rating=review.manager_rating,
                to_rating=rating,
                comment=comment,
            )

        # Notify employee
        if review.employee.user:
            notify(
                user=review.employee.user,
                category=NotificationCategory.REVIEW_COMPLETED,
                title=f"Performance Review Completed: {review.cycle.name}",
                body="Your performance review has been finalized. You may now view your final rating and feedback.",
                link=f"/employee/reviews/{review.id}",
            )

    # 5. COMPLETED -> ACKNOWLEDGED
    elif from_status == ReviewStatus.COMPLETED and to_status == ReviewStatus.ACKNOWLEDGED:
        if review.employee.user_id != actor.id and actor.role != "HR_ADMIN":
            raise DomainException(
                "Only the employee can acknowledge their completed review.",
                code="forbidden",
                status_code=403,
            )
        review.acknowledged_at = timezone.now()

    # 6. COMPLETED -> DISPUTED
    elif from_status == ReviewStatus.COMPLETED and to_status == ReviewStatus.DISPUTED:
        if review.employee.user_id != actor.id and actor.role != "HR_ADMIN":
            raise DomainException(
                "Only the employee can dispute their review.",
                code="forbidden",
                status_code=403,
            )

        reason = data.get("reason", "").strip()
        if not reason:
            raise DomainException(
                "A dispute reason is required.",
                code="validation_error",
                status_code=400,
                details={"reason": ["Dispute reason cannot be empty."]},
            )

        review.dispute_reason = reason
        review.disputed_at = timezone.now()

        # Notify reviewer
        if review.reviewer and review.reviewer.user:
            notify(
                user=review.reviewer.user,
                category=NotificationCategory.REVIEW_DUE,
                title=f"Review Disputed: {review.employee.name}",
                body=f"{review.employee.name} has submitted a dispute on their review: {reason}",
                link=f"/manager/reviews/{review.id}",
            )

    # 7. DISPUTED -> CALIBRATION (Reopen)
    elif from_status == ReviewStatus.DISPUTED and to_status == ReviewStatus.CALIBRATION:
        if actor.role != "HR_ADMIN":
            raise DomainException(
                "Only HR Admins can reopen a disputed review.",
                code="forbidden",
                status_code=403,
            )

        comment = data.get("comment", "").strip()
        review.dispute_reason = f"[REOPENED] {comment}" if comment else "[REOPENED]"

    review.status = to_status
    review.save()

    audit_log(
        actor=actor,
        action="REVIEW_TRANSITION",
        entity_type="performance_review",
        entity_id=str(review.id),
        entity_label=f"Review: {review.employee.name} — {review.cycle.name}",
        before={"status": from_status},
        after={"status": to_status},
    )

    return review


@transaction.atomic
def propose_calibration(
    review: PerformanceReview,
    calibrated_rating: int,
    comment: str,
    actor: User,
) -> PerformanceReview:
    """Records proposed calibration rating and comment."""
    if actor.role != "HR_ADMIN":
        raise DomainException(
            "Only HR Admins can propose calibrated ratings.",
            code="forbidden",
            status_code=403,
        )

    validate_rating_in_bounds(calibrated_rating, "calibrated_rating")
    if not comment or not comment.strip():
        raise DomainException(
            "A comment is required when proposing a calibrated rating.",
            code="validation_error",
            status_code=400,
            details={"comment": ["Comment cannot be empty."]},
        )

    review.proposed_calibrated_rating = calibrated_rating
    review.calibration_comment = comment.strip()
    review.status = ReviewStatus.CALIBRATION
    review.save(
        update_fields=[
            "proposed_calibrated_rating",
            "calibration_comment",
            "status",
            "updated_at",
        ]
    )

    ReviewCalibrationEntry.objects.create(
        review=review,
        actor=actor,
        from_rating=review.manager_rating,
        to_rating=calibrated_rating,
        comment=comment.strip(),
    )

    audit_log(
        actor=actor,
        action="CALIBRATION_PROPOSED",
        entity_type="performance_review",
        entity_id=str(review.id),
        entity_label=f"Review: {review.employee.name}",
        after={"calibrated_rating": calibrated_rating, "comment": comment.strip()},
    )

    return review


@transaction.atomic
def finalize_calibration(
    review: PerformanceReview,
    final_rating: int | None,
    comment: str,
    actor: User,
) -> PerformanceReview:
    """Finalizes calibration, approves final rating, and transitions review to COMPLETED."""
    return transition_review(
        review=review,
        to_status=ReviewStatus.COMPLETED,
        actor=actor,
        data={"final_rating": final_rating, "comment": comment},
    )


@transaction.atomic
def reopen_dispute(
    review: PerformanceReview,
    comment: str,
    actor: User,
) -> PerformanceReview:
    """Reopens a DISPUTED review back to CALIBRATION status."""
    return transition_review(
        review=review,
        to_status=ReviewStatus.CALIBRATION,
        actor=actor,
        data={"comment": comment},
    )


@transaction.atomic
def activate_review_cycle(cycle: ReviewCycle, actor: User) -> ReviewCycle:
    """Activates a DRAFT review cycle, creating reviews for active employees and snapshotting scale."""
    if cycle.status != CycleStatus.DRAFT:
        raise DomainException(
            f"Only DRAFT cycles can be activated (current: {cycle.status}).",
            code="state_conflict",
            status_code=409,
        )

    org = get_organization()
    if org and org.settings_performance:
        cycle.rating_scale_snapshot = org.settings_performance.get("rating_scale")

    cycle.status = CycleStatus.ACTIVE
    cycle.save(update_fields=["status", "rating_scale_snapshot", "updated_at"])

    # Create reviews for active employees in included departments
    from apps.employees.models import Employee, EmploymentStatus

    depts = cycle.departments.all()
    employees = Employee.objects.filter(employment_status=EmploymentStatus.ACTIVE)
    if depts.exists():
        employees = employees.filter(department__in=depts)

    for emp in employees:
        PerformanceReview.objects.get_or_create(
            employee=emp,
            cycle=cycle,
            defaults={
                "reviewer": emp.manager,
                "status": ReviewStatus.SELF_ASSESSMENT,
            },
        )

    # Celery notification task
    from apps.performance.tasks import send_cycle_activation_notifications

    transaction.on_commit(lambda: send_cycle_activation_notifications.delay(str(cycle.id)))

    audit_log(
        actor=actor,
        action="CYCLE_ACTIVATED",
        entity_type="review_cycle",
        entity_id=str(cycle.id),
        entity_label=cycle.name,
        after={"status": cycle.status, "reviews_created": employees.count()},
    )

    return cycle


@transaction.atomic
def start_calibration_cycle(cycle: ReviewCycle, actor: User, force: bool = False) -> ReviewCycle:
    """Transitions an active cycle to calibration."""
    if cycle.status != CycleStatus.ACTIVE:
        raise DomainException(
            f"Only ACTIVE cycles can enter calibration (current: {cycle.status}).",
            code="state_conflict",
            status_code=409,
        )

    pending_self = PerformanceReview.objects.filter(
        cycle=cycle, status=ReviewStatus.SELF_ASSESSMENT
    ).count()

    if pending_self > 0 and not force:
        raise DomainException(
            f"{pending_self} self-assessment(s) are still pending. Pass force=true to proceed.",
            code="state_conflict",
            status_code=409,
            details={"reason": "PENDING_SELF_ASSESSMENTS", "pending_count": pending_self},
        )

    cycle.status = CycleStatus.CALIBRATION
    cycle.save(update_fields=["status", "updated_at"])

    audit_log(
        actor=actor,
        action="CYCLE_CALIBRATION_STARTED",
        entity_type="review_cycle",
        entity_id=str(cycle.id),
        entity_label=cycle.name,
        after={"status": cycle.status, "force": force},
    )

    return cycle


@transaction.atomic
def close_review_cycle(cycle: ReviewCycle, actor: User) -> ReviewCycle:
    """Closes a review cycle, ensuring all reviews are resolved."""
    if cycle.status != CycleStatus.CALIBRATION:
        raise DomainException(
            f"Only cycles in CALIBRATION can be closed (current: {cycle.status}).",
            code="state_conflict",
            status_code=409,
        )

    unresolved = (
        PerformanceReview.objects.filter(cycle=cycle)
        .exclude(
            status__in=[ReviewStatus.COMPLETED, ReviewStatus.ACKNOWLEDGED, ReviewStatus.DISPUTED]
        )
        .count()
    )

    if unresolved > 0:
        raise DomainException(
            f"{unresolved} review(s) are not yet finalized. All reviews must be completed before closing.",
            code="state_conflict",
            status_code=409,
            details={"reason": "UNCOMPLETED_REVIEWS", "unresolved_count": unresolved},
        )

    cycle.status = CycleStatus.CLOSED
    cycle.save(update_fields=["status", "updated_at"])

    audit_log(
        actor=actor,
        action="CYCLE_CLOSED",
        entity_type="review_cycle",
        entity_id=str(cycle.id),
        entity_label=cycle.name,
        after={"status": cycle.status},
    )

    return cycle


def get_cycle_action_preview(cycle: ReviewCycle, action: str) -> dict:
    """Provide consequence and blocker previews for cycle status transitions."""
    from apps.employees.models import Employee, EmploymentStatus

    if action == "activate":
        depts = cycle.departments.all()
        emp_qs = Employee.objects.filter(employment_status=EmploymentStatus.ACTIVE)
        if depts.exists():
            emp_qs = emp_qs.filter(department__in=depts)
        emp_count = emp_qs.count()

        blockers = []
        if cycle.status != CycleStatus.DRAFT:
            blockers.append(
                f"Cycle is in {cycle.status} status; only DRAFT cycles can be activated."
            )

        return {
            "action": "activate",
            "consequences": [
                f"Will create {emp_count} performance reviews in SELF_ASSESSMENT status.",
                "Will snapshot current organization rating scale.",
                "Will notify all eligible employees and reviewers.",
            ],
            "counts": {"reviews_to_create": emp_count, "notifications_to_send": emp_count * 2},
            "blockers": blockers,
        }

    elif action == "start_calibration":
        pending_self = PerformanceReview.objects.filter(
            cycle=cycle, status=ReviewStatus.SELF_ASSESSMENT
        ).count()
        blockers = []
        if cycle.status != CycleStatus.ACTIVE:
            blockers.append("Cycle must be in ACTIVE status to start calibration.")
        if pending_self > 0:
            blockers.append(f"{pending_self} reviews are still in SELF_ASSESSMENT.")

        return {
            "action": "start_calibration",
            "consequences": [
                "Will move review cycle to CALIBRATION status.",
                "HR calibration board will open for rating adjustments.",
            ],
            "counts": {"pending_self_assessments": pending_self},
            "blockers": blockers,
        }

    elif action == "close":
        unresolved = (
            PerformanceReview.objects.filter(cycle=cycle)
            .exclude(
                status__in=[
                    ReviewStatus.COMPLETED,
                    ReviewStatus.ACKNOWLEDGED,
                    ReviewStatus.DISPUTED,
                ]
            )
            .count()
        )
        blockers = []
        if cycle.status != CycleStatus.CALIBRATION:
            blockers.append("Cycle must be in CALIBRATION status to be closed.")
        if unresolved > 0:
            blockers.append(f"{unresolved} reviews are still pending finalization.")

        return {
            "action": "close",
            "consequences": [
                "Will permanently close the review cycle.",
                "All finalized ratings will be locked.",
            ],
            "counts": {"unresolved_reviews": unresolved},
            "blockers": blockers,
        }

    return {"action": action, "consequences": [], "counts": {}, "blockers": ["Unknown action."]}
