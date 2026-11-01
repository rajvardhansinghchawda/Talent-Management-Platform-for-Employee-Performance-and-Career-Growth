"""Serializers for Goals, Updates, Comments, and Scoring."""

from decimal import Decimal

from rest_framework import serializers

from apps.employees.models import Employee
from apps.performance.models import (
    Goal,
    GoalComment,
    GoalDirection,
    GoalType,
    GoalUpdate,
    ReviewCycle,
)


class ReviewCycleSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewCycle
        fields = [
            "id",
            "name",
            "cycle_type",
            "status",
            "start_date",
            "end_date",
            "self_assessment_due",
            "manager_review_due",
        ]


class GoalOwnerSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    designation = serializers.CharField(source="job_role.title", read_only=True, default="")

    class Meta:
        model = Employee
        fields = ["id", "name", "employee_code", "designation"]

    def get_name(self, obj: Employee) -> str:
        return obj.name


class GoalParentSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Goal
        fields = ["id", "title", "status"]


class GoalListSerializer(serializers.ModelSerializer):
    owner = GoalOwnerSerializer(read_only=True)
    cycle = ReviewCycleSimpleSerializer(read_only=True)
    parent = GoalParentSimpleSerializer(read_only=True)
    progress_pct = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    is_locked = serializers.BooleanField(read_only=True)

    class Meta:
        model = Goal
        fields = [
            "id",
            "title",
            "description",
            "goal_type",
            "metric_unit",
            "start_value",
            "target_value",
            "current_value",
            "direction",
            "weight",
            "due_date",
            "status",
            "submitted_at",
            "completed_at",
            "progress_pct",
            "is_overdue",
            "is_locked",
            "owner",
            "cycle",
            "parent",
            "created_at",
            "updated_at",
        ]


class GoalDetailSerializer(GoalListSerializer):
    can_update_progress = serializers.BooleanField(read_only=True)
    can_complete = serializers.BooleanField(read_only=True)
    score = serializers.DecimalField(max_digits=5, decimal_places=4, read_only=True)

    class Meta(GoalListSerializer.Meta):
        fields = GoalListSerializer.Meta.fields + [
            "can_update_progress",
            "can_complete",
            "score",
            "completion_note",
        ]


class GoalCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    goal_type = serializers.ChoiceField(choices=GoalType.choices, default=GoalType.KPI)
    metric_unit = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    start_value = serializers.DecimalField(max_digits=15, decimal_places=4, default=Decimal("0"))
    target_value = serializers.DecimalField(max_digits=15, decimal_places=4, default=Decimal("100"))
    direction = serializers.ChoiceField(
        choices=GoalDirection.choices, default=GoalDirection.HIGHER_BETTER
    )
    weight = serializers.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("1.0"), min_value=Decimal("0.01")
    )
    due_date = serializers.DateField(required=False, allow_null=True, default=None)
    cycle = serializers.UUIDField(required=False, allow_null=True, default=None)
    parent = serializers.UUIDField(required=False, allow_null=True, default=None)
    employee = serializers.UUIDField(
        required=False,
        allow_null=True,
        default=None,
        help_text="Target employee when manager or HR assigns a goal.",
    )


class GoalUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=500, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    goal_type = serializers.ChoiceField(choices=GoalType.choices, required=False)
    metric_unit = serializers.CharField(max_length=50, required=False, allow_blank=True)
    start_value = serializers.DecimalField(max_digits=15, decimal_places=4, required=False)
    target_value = serializers.DecimalField(max_digits=15, decimal_places=4, required=False)
    direction = serializers.ChoiceField(choices=GoalDirection.choices, required=False)
    weight = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, min_value=Decimal("0.01")
    )
    due_date = serializers.DateField(required=False, allow_null=True)
    cycle = serializers.UUIDField(required=False, allow_null=True)
    parent = serializers.UUIDField(required=False, allow_null=True)


class GoalUpdateProgressSerializer(serializers.Serializer):
    value = serializers.DecimalField(max_digits=15, decimal_places=4)
    note = serializers.CharField(required=False, allow_blank=True, default="")
    evidence_url = serializers.URLField(required=False, allow_blank=True, default="")


class GoalCompleteSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, default="")


class GoalApprovalSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True, default="")


class GoalRejectionSerializer(serializers.Serializer):
    comment = serializers.CharField(required=True, allow_blank=False)

    def validate_comment(self, value: str) -> str:
        if not value or not value.strip():
            raise serializers.ValidationError("A rejection comment is required.")
        return value.strip()


class GoalProgressUpdateItemSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = GoalUpdate
        fields = ["id", "author", "value", "note", "evidence_url", "created_at"]

    def get_author(self, obj: GoalUpdate) -> dict:
        return {
            "id": str(obj.author.id),
            "name": obj.author.name,
            "employee_code": obj.author.employee_code,
        }


class GoalCommentItemSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = GoalComment
        fields = ["id", "author", "kind", "text", "created_at"]

    def get_author(self, obj: GoalComment) -> dict:
        user = obj.author
        name = user.get_full_name() or user.email
        return {
            "id": str(user.id),
            "name": name,
            "role": user.role,
        }


class GoalContributionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    weight = serializers.DecimalField(max_digits=5, decimal_places=2)
    progress_pct = serializers.DecimalField(max_digits=5, decimal_places=2)
    score = serializers.DecimalField(max_digits=5, decimal_places=4)
    weighted_contribution = serializers.DecimalField(max_digits=5, decimal_places=4)
    status = serializers.CharField()


class GoalScoreSummarySerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    cycle_id = serializers.UUIDField(allow_null=True)
    weighted_score = serializers.DecimalField(max_digits=5, decimal_places=4)
    total_weight = serializers.DecimalField(max_digits=8, decimal_places=2)
    cap = serializers.DecimalField(max_digits=3, decimal_places=2)
    weight_sum_warning = serializers.BooleanField()
    goals = GoalContributionSerializer(many=True)
