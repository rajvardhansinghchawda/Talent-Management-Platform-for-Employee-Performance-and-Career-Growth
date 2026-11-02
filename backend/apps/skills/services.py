"""Services for Skills and Job Roles."""

import uuid
from typing import Any

from django.db import transaction

from apps.core.exceptions import NotFound, StateConflict
from apps.learning.models import CourseSkill
from apps.skills.models import CareerPathStep, JobRole, RoleSkill, Skill, SkillAssessment


def delete_skill(skill_id: uuid.UUID) -> None:
    """Deletes a skill if unused, otherwise raises StateConflict."""
    try:
        skill = Skill.objects.get(pk=skill_id)
    except Skill.DoesNotExist:
        raise NotFound(message="Skill not found.")

    assessments_count = SkillAssessment.objects.filter(skill=skill).count()
    roles_count = RoleSkill.objects.filter(skill=skill).count()
    courses_count = CourseSkill.objects.filter(skill=skill).count()

    if assessments_count > 0 or roles_count > 0 or courses_count > 0:
        raise StateConflict(
            code="SKILL_IN_USE",
            message="Skill is in use and cannot be deleted. Deactivate it instead.",
            details={
                "usage": {
                    "employees": assessments_count,
                    "roles": roles_count,
                    "courses": courses_count,
                }
            },
        )

    skill.delete()


def deactivate_skill(skill_id: uuid.UUID) -> Skill:
    """Deactivates a skill."""
    try:
        skill = Skill.objects.get(pk=skill_id)
    except Skill.DoesNotExist:
        raise NotFound(message="Skill not found.")

    skill.is_active = False
    skill.save(update_fields=["is_active", "updated_at"])
    return skill


@transaction.atomic
def bulk_replace_role_skills(role: JobRole, skills_data: list[dict[str, Any]]) -> list[RoleSkill]:
    """Atomically replaces all skill requirements for a role."""
    RoleSkill.objects.filter(role=role).delete()
    new_role_skills = []
    for item in skills_data:
        skill_obj = Skill.objects.get(pk=item["skill"])
        rs = RoleSkill.objects.create(
            role=role,
            skill=skill_obj,
            required_level=item.get("required_level", 1),
            weight=item.get("weight", 1),
            is_must_have=item.get("is_must_have", False),
        )
        new_role_skills.append(rs)
    return new_role_skills


def add_career_step(
    from_role: JobRole, to_role_id: uuid.UUID, typical_duration_months: int = 12
) -> CareerPathStep:
    """Adds a valid transition step to another role, preventing self-loops."""
    if str(from_role.id) == str(to_role_id):
        raise StateConflict(
            code="INVALID_CAREER_STEP",
            message="A role cannot transition to itself.",
        )
    try:
        to_role = JobRole.objects.get(pk=to_role_id)
    except JobRole.DoesNotExist:
        raise NotFound(message="Target role not found.")

    step, _ = CareerPathStep.objects.get_or_create(
        from_role=from_role,
        to_role=to_role,
    )
    return step


def remove_career_step(from_role: JobRole, to_role_id: uuid.UUID) -> None:
    """Removes a career step transition."""
    CareerPathStep.objects.filter(from_role=from_role, to_role_id=to_role_id).delete()
