"""Serializers for Skills, Job Roles, Role Skills, and Career Paths."""

from rest_framework import serializers

from apps.learning.models import CourseSkill
from apps.skills.models import CareerPathStep, JobRole, RoleSkill, Skill, SkillAssessment


class SkillSerializer(serializers.ModelSerializer):
    """Skill serializer including usage stats."""

    usage = serializers.SerializerMethodField()

    class Meta:
        model = Skill
        fields = [
            "id",
            "name",
            "category",
            "description",
            "is_active",
            "usage",
            "created_at",
            "updated_at",
        ]

    def get_usage(self, obj: Skill) -> dict[str, int]:
        return {
            "employees": SkillAssessment.objects.filter(skill=obj).count(),
            "roles": RoleSkill.objects.filter(skill=obj).count(),
            "courses": CourseSkill.objects.filter(skill=obj).count(),
        }


class SkillCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ["name", "category", "description", "is_active"]


class RoleSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill.name", read_only=True)
    category = serializers.CharField(source="skill.category", read_only=True)

    class Meta:
        model = RoleSkill
        fields = [
            "id",
            "skill",
            "skill_name",
            "category",
            "required_level",
            "weight",
            "is_must_have",
        ]


class RoleSkillCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoleSkill
        fields = ["skill", "required_level", "weight", "is_must_have"]


class CareerPathStepSerializer(serializers.ModelSerializer):
    to_role_title = serializers.CharField(source="to_role.title", read_only=True)
    to_role_track = serializers.CharField(source="to_role.track", read_only=True)
    to_role_level = serializers.IntegerField(source="to_role.level", read_only=True)

    class Meta:
        model = CareerPathStep
        fields = [
            "id",
            "from_role",
            "to_role",
            "to_role_title",
            "to_role_track",
            "to_role_level",
            "typical_duration_months",
        ]


class JobRoleListSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = JobRole
        fields = [
            "id",
            "title",
            "department",
            "department_name",
            "track",
            "level",
            "employee_count",
            "is_critical",
            "created_at",
        ]

    def get_employee_count(self, obj: JobRole) -> int:
        return obj.employees.count() if hasattr(obj, "employees") else 0


class JobRoleDetailSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    employee_count = serializers.SerializerMethodField()
    skills = RoleSkillSerializer(source="role_skills", many=True, read_only=True)
    next_roles = CareerPathStepSerializer(source="career_steps_from", many=True, read_only=True)

    class Meta:
        model = JobRole
        fields = [
            "id",
            "title",
            "department",
            "department_name",
            "track",
            "level",
            "description",
            "min_months_in_role",
            "is_critical",
            "employee_count",
            "skills",
            "next_roles",
            "created_at",
            "updated_at",
        ]

    def get_employee_count(self, obj: JobRole) -> int:
        return obj.employees.count() if hasattr(obj, "employees") else 0


class JobRoleCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobRole
        fields = [
            "title",
            "department",
            "track",
            "level",
            "description",
            "min_months_in_role",
            "is_critical",
        ]
