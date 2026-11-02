"""Services for Learning and Courses."""

from typing import Any

from django.db import transaction

from apps.core.exceptions import StateConflict
from apps.learning.models import Course, CourseSkill
from apps.skills.models import Skill


@transaction.atomic
def set_course_skills(course: Course, skills_data: list[dict[str, Any]]) -> list[CourseSkill]:
    """Atomically replaces the skills mapped to a course."""
    CourseSkill.objects.filter(course=course).delete()
    new_course_skills = []
    for item in skills_data:
        skill = Skill.objects.get(pk=item["skill"])
        level_from = item.get("level_from", 1)
        level_to = item.get("level_to", 2)
        if level_from >= level_to:
            raise StateConflict(
                code="INVALID_LEVELS",
                message="level_from must be strictly less than level_to.",
            )
        cs = CourseSkill.objects.create(
            course=course,
            skill=skill,
            level_from=level_from,
            level_to=level_to,
        )
        new_course_skills.append(cs)
    return new_course_skills
