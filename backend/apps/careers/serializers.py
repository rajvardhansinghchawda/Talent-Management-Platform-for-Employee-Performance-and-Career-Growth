"""Serializers for Careers and Development Plans."""

from rest_framework import serializers

from apps.careers.models import (
    DevelopmentPlan,
    DevelopmentPlanItem,
    PromotionReviewFlag,
)


class DevelopmentPlanItemSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", default=None, read_only=True)
    skill_name = serializers.CharField(source="skill.name", default=None, read_only=True)

    class Meta:
        model = DevelopmentPlanItem
        fields = [
            "id",
            "title",
            "item_type",
            "course",
            "course_title",
            "skill",
            "skill_name",
            "status",
            "due_date",
            "created_at",
        ]


class DevelopmentPlanSerializer(serializers.ModelSerializer):
    employee_id = serializers.UUIDField(source="employee.id", read_only=True)
    employee_name = serializers.CharField(source="employee.name", read_only=True)
    employee_code = serializers.CharField(source="employee.employee_code", read_only=True)
    target_role_title = serializers.CharField(source="target_role.title", default="General", read_only=True)
    progress_pct = serializers.IntegerField(read_only=True)
    item_count = serializers.SerializerMethodField()
    items = DevelopmentPlanItemSerializer(many=True, read_only=True)

    class Meta:
        model = DevelopmentPlan
        fields = [
            "id",
            "employee_id",
            "employee_name",
            "employee_code",
            "target_role",
            "target_role_title",
            "start_date",
            "target_date",
            "status",
            "progress_pct",
            "item_count",
            "items",
            "created_at",
        ]

    def get_item_count(self, obj: DevelopmentPlan) -> int:
        return obj.items.count()


class PromotionReviewFlagSerializer(serializers.ModelSerializer):
    flagged_at = serializers.DateTimeField(source="created_at", read_only=True)
    justification_note = serializers.CharField(source="note", read_only=True)

    class Meta:
        model = PromotionReviewFlag
        fields = [
            "id",
            "employee",
            "target_role",
            "flagged_by",
            "note",
            "justification_note",
            "status",
            "flagged_at",
            "created_at",
        ]
