"""Skill gap analysis engine — gap calculation, coverage, radar data, why_it_matters text."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from apps.employees.models import Employee
    from apps.skills.models import JobRole


def compute_skill_gap(employee: Employee, target_role: JobRole) -> dict:
    """
    Compute full skill gap analysis for an employee against a target role.

    Returns a dict matching the /skills/gaps/ API contract:
    {
        target_role: {id, title},
        coverage: Decimal,
        must_haves_remaining: int,
        unmet_must_haves: [str],
        items: [
            {
                skill: {id, name},
                required: int,
                validated: int,
                self: int | None,
                gap: int,
                weight: int,
                is_must_have: bool,
                status: "GAP" | "MET" | "UNVALIDATED",
                priority: int,
                why_it_matters: str,
            }
        ],
        radar: {
            axes: [str],
            required: [int],
            validated: [int],
        }
    }

    Rules:
    - Uses validated skill levels only (status=VALIDATED, most recent)
    - Self-assessed levels are shown as `self` but NEVER used in gap/coverage/readiness
    - Items sorted by priority desc, with must-haves first on ties
    - coverage = sum(min(validated, required) * weight) / sum(required * weight)
    """

    role_skills = list(target_role.role_skills.select_related("skill").all())

    # Get validated and self-assessed levels for this employee
    validated_levels = _get_validated_levels(employee)
    self_levels = _get_self_levels(employee)

    items = []
    total_weighted_required = Decimal("0")
    total_weighted_coverage = Decimal("0")

    for rs in role_skills:
        skill = rs.skill
        validated = validated_levels.get(skill.id)
        self_level = self_levels.get(skill.id)
        required = rs.required_level

        gap = max(0, required - (validated or 0))
        if validated is None:
            status = "UNVALIDATED"
        elif gap == 0:
            status = "MET"
        else:
            status = "GAP"

        # Priority: gap * weight, must-haves sort first within equal priority
        priority = gap * rs.weight

        # Why it matters text (server-generated)
        importance = "Must-have" if rs.is_must_have else "Important"
        why_it_matters = f"{importance} for {target_role.title} (weight {rs.weight})" + (
            f"; gap of {gap} level(s)." if gap > 0 else "."
        )

        # Coverage contribution
        weighted_required = Decimal(str(required)) * Decimal(str(rs.weight))
        weighted_coverage = Decimal(str(min(validated or 0, required))) * Decimal(str(rs.weight))
        total_weighted_required += weighted_required
        total_weighted_coverage += weighted_coverage

        items.append(
            {
                "skill": {"id": str(skill.id), "name": skill.name},
                "required": required,
                "validated": validated,
                "self": self_level,
                "gap": gap,
                "weight": rs.weight,
                "is_must_have": rs.is_must_have,
                "status": status,
                "priority": priority,
                "why_it_matters": why_it_matters,
            }
        )

    # Sort: must-haves first on priority ties; then by priority desc
    items.sort(key=lambda x: (-x["is_must_have"], -x["priority"]))

    # Coverage
    if total_weighted_required > 0:
        coverage = (total_weighted_coverage / total_weighted_required).quantize(
            Decimal("0.0001"), rounding=ROUND_HALF_UP
        )
    else:
        coverage = Decimal("0")

    unmet_must_haves = [
        item["skill"]["name"] for item in items if item["is_must_have"] and item["gap"] > 0
    ]

    # Radar chart data (consistent with item list)
    radar_axes = [item["skill"]["name"] for item in items]
    radar_required = [item["required"] for item in items]
    radar_validated = [item["validated"] or 0 for item in items]

    return {
        "target_role": {"id": str(target_role.id), "title": target_role.title},
        "coverage": float(coverage),
        "must_haves_remaining": len(unmet_must_haves),
        "unmet_must_haves": unmet_must_haves,
        "items": items,
        "radar": {
            "axes": radar_axes,
            "required": radar_required,
            "validated": radar_validated,
        },
    }


def _get_validated_levels(employee: Employee) -> dict:
    """Return {skill_id: level} for the most recent VALIDATED assessment per skill."""
    from apps.skills.models import SkillAssessment, SkillAssessmentStatus

    assessments = SkillAssessment.objects.filter(
        employee=employee,
        status=SkillAssessmentStatus.VALIDATED,
    ).order_by("skill_id", "-validated_on", "-created_at")

    levels: dict = {}
    for a in assessments:
        if a.skill_id not in levels:
            levels[a.skill_id] = a.level
    return levels


def _get_self_levels(employee: Employee) -> dict:
    """Return {skill_id: level} for the most recent SELF assessment per skill (provisional)."""
    from apps.skills.models import SkillAssessment, SkillAssessmentSource

    assessments = SkillAssessment.objects.filter(
        employee=employee,
        source=SkillAssessmentSource.SELF,
    ).order_by("skill_id", "-created_at")

    levels: dict = {}
    for a in assessments:
        if a.skill_id not in levels:
            levels[a.skill_id] = a.level
    return levels
