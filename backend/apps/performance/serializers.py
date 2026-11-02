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
    PerformanceReview,
    ReviewCalibrationEntry,
    ReviewCompetencyRating,
    ReviewCycle,
    ReviewStatus,
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


class ReviewCycleCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewCycle
        fields = [
            "name",
            "cycle_type",
            "start_date",
            "end_date",
            "self_assessment_due",
            "manager_review_due",
            "departments",
        ]

    def validate(self, attrs):
        start = attrs.get("start_date")
        end = attrs.get("end_date")
        self_due = attrs.get("self_assessment_due")
        mgr_due = attrs.get("manager_review_due")
        if start and end and start > end:
            raise serializers.ValidationError("start_date cannot be after end_date.")
        if start and self_due and start > self_due:
            raise serializers.ValidationError("self_assessment_due cannot be before start_date.")
        if self_due and mgr_due and self_due > mgr_due:
            raise serializers.ValidationError(
                "manager_review_due cannot be before self_assessment_due."
            )
        if mgr_due and end and mgr_due > end:
            raise serializers.ValidationError("manager_review_due cannot be after end_date.")
        return attrs


class ReviewCycleDetailSerializer(serializers.ModelSerializer):
    departments = serializers.SerializerMethodField()

    class Meta:
        model = ReviewCycle
        fields = [
            "id",
            "name",
            "cycle_type",
            "start_date",
            "end_date",
            "self_assessment_due",
            "manager_review_due",
            "status",
            "departments",
            "rating_scale_snapshot",
            "created_at",
            "updated_at",
        ]

    def get_departments(self, obj: ReviewCycle) -> list[dict]:
        return [{"id": str(d.id), "name": d.name} for d in obj.departments.all()]


class CalibrationReviewItemSerializer(serializers.ModelSerializer):
    review_id = serializers.UUIDField(source="id", read_only=True)
    employee = serializers.SerializerMethodField()
    manager = serializers.SerializerMethodField()
    goal_score = serializers.DecimalField(
        source="goal_score_snapshot", max_digits=5, decimal_places=4, read_only=True
    )
    has_dispute = serializers.SerializerMethodField()

    class Meta:
        model = PerformanceReview
        fields = [
            "id",
            "review_id",
            "employee",
            "manager",
            "self_rating",
            "manager_rating",
            "goal_score",
            "proposed_calibrated_rating",
            "calibration_comment",
            "calibrated_rating",
            "final_rating",
            "status",
            "has_dispute",
        ]

    def get_employee(self, obj: PerformanceReview) -> dict:
        emp = obj.employee
        dept = emp.department.name if emp.department else None
        return {
            "id": str(emp.id),
            "name": emp.name,
            "employee_code": emp.employee_code,
            "department": dept,
        }

    def get_manager(self, obj: PerformanceReview) -> dict | None:
        mgr = obj.reviewer
        if not mgr:
            return None
        return {
            "id": str(mgr.id),
            "name": mgr.name,
        }

    def get_has_dispute(self, obj: PerformanceReview) -> bool:
        return bool(obj.disputed_at or obj.dispute_reason)


class CalibrationProposalSerializer(serializers.Serializer):
    calibrated_rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(min_length=1)


class CalibrationFinalizeSerializer(serializers.Serializer):
    final_rating = serializers.IntegerField(min_value=1, max_value=5, required=False)
    comment = serializers.CharField(required=False, allow_blank=True)


class HRDashboardSerializer(serializers.Serializer):
    kpis = serializers.DictField()
    cycle_progress_by_department = serializers.ListField(child=serializers.DictField())
    top_org_skill_gaps = serializers.ListField(child=serializers.DictField())
    readiness_distribution = serializers.DictField()
    recent_audit = serializers.ListField(child=serializers.DictField())


class ReviewCompetencyRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewCompetencyRating
        fields = [
            "id",
            "competency_name",
            "self_rating",
            "manager_rating",
            "comment",
        ]


class ReviewHistoryEntrySerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()

    class Meta:
        model = ReviewCalibrationEntry
        fields = ["id", "actor", "from_rating", "to_rating", "comment", "created_at"]

    def get_actor(self, obj: ReviewCalibrationEntry) -> dict:
        return {
            "id": str(obj.actor.id),
            "name": obj.actor.get_full_name() or obj.actor.email,
        }


class PerformanceReviewListSerializer(serializers.ModelSerializer):
    cycle = ReviewCycleSimpleSerializer(read_only=True)
    employee = GoalOwnerSerializer(read_only=True)
    reviewer = GoalOwnerSerializer(read_only=True)
    next_action = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = PerformanceReview
        fields = [
            "id",
            "cycle",
            "employee",
            "reviewer",
            "status",
            "next_action",
            "is_overdue",
            "created_at",
            "updated_at",
        ]

    def get_next_action(self, obj: PerformanceReview) -> str:
        if obj.status == ReviewStatus.SELF_ASSESSMENT:
            return "START_SELF_ASSESSMENT"
        elif obj.status == ReviewStatus.MANAGER_REVIEW:
            return "COMPLETE_MANAGER_REVIEW"
        elif obj.status == ReviewStatus.CALIBRATION:
            return "AWAIT_CALIBRATION"
        elif obj.status == ReviewStatus.COMPLETED:
            return "ACKNOWLEDGE"
        return "NONE"

    def get_is_overdue(self, obj: PerformanceReview) -> bool:
        from django.utils import timezone

        today = timezone.now().date()
        cycle = obj.cycle
        if obj.status == ReviewStatus.SELF_ASSESSMENT and cycle.self_assessment_due:
            return cycle.self_assessment_due < today
        if obj.status == ReviewStatus.MANAGER_REVIEW and cycle.manager_review_due:
            return cycle.manager_review_due < today
        return False


class PerformanceReviewDetailSerializer(serializers.ModelSerializer):
    cycle = ReviewCycleSimpleSerializer(read_only=True)
    employee = GoalOwnerSerializer(read_only=True)
    reviewer = GoalOwnerSerializer(read_only=True)
    competency_ratings = ReviewCompetencyRatingSerializer(many=True, read_only=True)
    calibration_history = ReviewHistoryEntrySerializer(many=True, read_only=True)

    class Meta:
        model = PerformanceReview
        fields = [
            "id",
            "cycle",
            "employee",
            "reviewer",
            "status",
            "self_rating",
            "self_comments",
            "self_assessment_draft",
            "self_assessment_submitted_at",
            "manager_rating",
            "manager_comments",
            "manager_draft",
            "manager_review_submitted_at",
            "proposed_calibrated_rating",
            "calibration_comment",
            "calibrated_rating",
            "final_rating",
            "goal_score_snapshot",
            "development_recommendations",
            "acknowledged_at",
            "dispute_reason",
            "disputed_at",
            "competency_ratings",
            "calibration_history",
            "created_at",
            "updated_at",
        ]

    def to_representation(self, instance: PerformanceReview):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if request and request.user.role == "EMPLOYEE":
            # If the logged-in user is the employee and review is not yet COMPLETED,
            # conceal confidential manager fields and ratings!
            if instance.status not in (
                ReviewStatus.COMPLETED,
                ReviewStatus.ACKNOWLEDGED,
                ReviewStatus.DISPUTED,
            ):
                for confidential_field in (
                    "manager_rating",
                    "manager_comments",
                    "manager_draft",
                    "manager_review_submitted_at",
                    "proposed_calibrated_rating",
                    "calibration_comment",
                    "calibrated_rating",
                    "final_rating",
                    "development_recommendations",
                ):
                    data[confidential_field] = None

                # Conceal manager ratings inside competency_ratings
                if "competency_ratings" in data and isinstance(data["competency_ratings"], list):
                    for comp in data["competency_ratings"]:
                        comp["manager_rating"] = None

        return data


class SelfAssessmentSubmitSerializer(serializers.Serializer):
    self_rating = serializers.IntegerField(min_value=1, max_value=5)
    self_comments = serializers.CharField(required=False, allow_blank=True, default="")
    competencies = serializers.ListField(
        child=serializers.DictField(), required=False, default=list
    )


class SelfAssessmentDraftSerializer(serializers.Serializer):
    draft = serializers.DictField()


class ManagerReviewSubmitSerializer(serializers.Serializer):
    manager_rating = serializers.IntegerField(min_value=1, max_value=5)
    manager_comments = serializers.CharField(required=False, allow_blank=True, default="")
    competencies = serializers.ListField(
        child=serializers.DictField(), required=False, default=list
    )
    development_recommendations = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )


class ManagerReviewDraftSerializer(serializers.Serializer):
    draft = serializers.DictField()


class ReviewDisputeSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=1)


class ReviewReopenSerializer(serializers.Serializer):
    comment = serializers.CharField(min_length=1)
