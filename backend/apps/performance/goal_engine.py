"""Goal calculation engine — scoring, progress, and weighted score."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from apps.performance.models import Goal


def compute_progress_pct(goal: Goal) -> Decimal:
    """
    Compute the display progress percentage (0–100) for a goal.

    Formula:
        HIGHER_BETTER: (current - start) / (target - start) * 100
        LOWER_BETTER:  (start - current) / (start - target) * 100
        Clamped to [0, 100].
        Special case: if target == start, returns 100 if the goal direction is met, else 0.

    Unit tests:
        - 8/10 HIGHER_BETTER, start=0 → 80%
        - LOWER_BETTER: start=100, target=50, current=60 → 80%
        - Overshoot HIGHER_BETTER beyond target → 100% (clamped)
        - target == start → 100 if met, else 0
    """
    from apps.performance.models import GoalDirection

    start = Decimal(str(goal.start_value))
    target = Decimal(str(goal.target_value))
    current = Decimal(str(goal.current_value))

    if target == start:
        if goal.direction == GoalDirection.HIGHER_BETTER:
            return Decimal("100") if current >= target else Decimal("0")
        else:
            return Decimal("100") if current <= target else Decimal("0")

    if goal.direction == GoalDirection.HIGHER_BETTER:
        ratio = (current - start) / (target - start) * 100
    else:
        ratio = (start - current) / (start - target) * 100

    return _clamp(ratio, Decimal("0"), Decimal("100"))


def compute_goal_score(goal: Goal, cap: Decimal = Decimal("1.0")) -> Decimal:
    """
    Compute the normalized score for a goal (used in weighted sum).
    Same formula as progress_pct but expressed as a fraction [0, cap].
    """
    from apps.performance.models import GoalDirection

    start = Decimal(str(goal.start_value))
    target = Decimal(str(goal.target_value))
    current = Decimal(str(goal.current_value))

    if target == start:
        if goal.direction == GoalDirection.HIGHER_BETTER:
            raw = Decimal("1") if current >= target else Decimal("0")
        else:
            raw = Decimal("1") if current <= target else Decimal("0")
    elif goal.direction == GoalDirection.HIGHER_BETTER:
        raw = (current - start) / (target - start)
    else:
        raw = (start - current) / (start - target)

    raw = _clamp(raw, Decimal("0"), cap)
    return raw.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def compute_weighted_score(goals: list, cap: Decimal = Decimal("1.0")) -> Decimal:
    """
    Compute the weighted score across a set of goals.

    weighted = sum(weight_i * score_i) / sum(weight_i)

    Only includes goals with status ACTIVE or COMPLETED.
    CANCELLED goals are excluded.
    Returns 0 if total weight is 0.
    """
    from apps.performance.models import GoalStatus

    eligible = [g for g in goals if g.status in (GoalStatus.ACTIVE, GoalStatus.COMPLETED)]

    total_weight = sum(Decimal(str(g.weight)) for g in eligible)
    if total_weight == Decimal("0"):
        return Decimal("0")

    weighted_sum = sum(Decimal(str(g.weight)) * compute_goal_score(g, cap=cap) for g in eligible)

    result = weighted_sum / total_weight
    return result.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def _clamp(value: Decimal, min_val: Decimal, max_val: Decimal) -> Decimal:
    """Clamp a Decimal value between min and max."""
    return max(min_val, min(max_val, value))
