from decimal import Decimal
from types import SimpleNamespace

from apps.performance.goal_engine import (
    compute_goal_score,
    compute_progress_pct,
    compute_weighted_score,
)
from apps.performance.models import GoalDirection, GoalStatus


def test_progress_pct_higher_better():
    # 8/10 from start 0 -> 80%
    goal = SimpleNamespace(
        start_value=Decimal("0"),
        target_value=Decimal("10"),
        current_value=Decimal("8"),
        direction=GoalDirection.HIGHER_BETTER,
    )
    assert compute_progress_pct(goal) == Decimal("80")


def test_progress_pct_lower_better():
    # start 100, target 50, current 60 -> (100 - 60) / (100 - 50) * 100 = 40/50 * 100 = 80%
    goal = SimpleNamespace(
        start_value=Decimal("100"),
        target_value=Decimal("50"),
        current_value=Decimal("60"),
        direction=GoalDirection.LOWER_BETTER,
    )
    assert compute_progress_pct(goal) == Decimal("80")


def test_progress_pct_clamp():
    # overshoot beyond target
    goal = SimpleNamespace(
        start_value=Decimal("0"),
        target_value=Decimal("10"),
        current_value=Decimal("15"),
        direction=GoalDirection.HIGHER_BETTER,
    )
    assert compute_progress_pct(goal) == Decimal("100")


def test_compute_goal_score_and_weighted_score():
    g1 = SimpleNamespace(
        start_value=Decimal("0"),
        target_value=Decimal("10"),
        current_value=Decimal("8"),
        direction=GoalDirection.HIGHER_BETTER,
        weight=Decimal("2"),
        status=GoalStatus.ACTIVE,
    )
    g2 = SimpleNamespace(
        start_value=Decimal("0"),
        target_value=Decimal("10"),
        current_value=Decimal("5"),
        direction=GoalDirection.HIGHER_BETTER,
        weight=Decimal("1"),
        status=GoalStatus.ACTIVE,
    )
    # g1 score = 0.8, weight = 2 (sum = 1.6)
    # g2 score = 0.5, weight = 1 (sum = 0.5)
    # weighted = 2.1 / 3 = 0.7
    assert compute_goal_score(g1) == Decimal("0.8000")
    assert compute_goal_score(g2) == Decimal("0.5000")
    assert compute_weighted_score([g1, g2]) == Decimal("0.7000")
