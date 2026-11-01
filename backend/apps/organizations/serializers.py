import re
from decimal import Decimal

from rest_framework import serializers

from .models import Department, Organization


class RatingScaleItemSerializer(serializers.Serializer):
    value = serializers.IntegerField(min_value=1)
    label = serializers.CharField(max_length=100)
    anchor = serializers.CharField(max_length=255)


class PerformanceSettingsSerializer(serializers.Serializer):
    rating_scale = serializers.ListField(
        child=RatingScaleItemSerializer(),
        required=False,
    )
    goal_score_cap = serializers.DecimalField(
        max_digits=3,
        decimal_places=2,
        min_value=Decimal("1.0"),
        max_value=Decimal("1.5"),
        required=False,
    )
    goal_weight_rule = serializers.DictField(required=False)
    goal_approval_required = serializers.BooleanField(required=False)

    def validate_rating_scale(self, value):
        if not value:
            raise serializers.ValidationError("Rating scale cannot be empty.")
        values = [item["value"] for item in value]
        expected = list(range(1, len(values) + 1))
        if values != expected:
            raise serializers.ValidationError(
                f"Rating scale values must be consecutive integers starting at 1 (expected {expected}, got {values})."
            )
        return value


class ReadinessThresholdsSerializer(serializers.Serializer):
    ready_coverage = serializers.DecimalField(
        max_digits=3, decimal_places=2, min_value=0, max_value=1
    )
    near_coverage = serializers.DecimalField(
        max_digits=3, decimal_places=2, min_value=0, max_value=1
    )
    min_goal_score = serializers.DecimalField(
        max_digits=3, decimal_places=2, min_value=0, max_value=Decimal("1.5")
    )
    min_rating = serializers.IntegerField(min_value=1, max_value=5)


class CareerSettingsSerializer(serializers.Serializer):
    readiness_thresholds = ReadinessThresholdsSerializer(required=False)
    show_self_assessed_as_provisional = serializers.BooleanField(required=False)
    target_role_scope = serializers.ChoiceField(choices=["PATH", "ALL"], required=False)


class PrivacySettingsSerializer(serializers.Serializer):
    confidential_feedback_visibility = serializers.ChoiceField(
        choices=["HR_NONE", "HR_AUDITED"], required=False
    )
    ai_enabled = serializers.BooleanField(required=False)
    retention_notes = serializers.CharField(allow_blank=True, required=False)


class GeneralSettingsSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    accent_color = serializers.CharField(max_length=7, required=False)

    def validate_accent_color(self, value):
        if not re.match(r"^#(?:[0-9a-fA-F]{3}){1,2}$", value):
            raise serializers.ValidationError("Invalid hex color code.")
        return value


class OrganizationSerializer(serializers.ModelSerializer):
    logo_url = serializers.CharField(read_only=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "logo_url",
            "accent_color",
            "settings_general",
            "settings_performance",
            "settings_career",
            "settings_privacy",
            "created_at",
            "updated_at",
        ]


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Department
        fields = ["id", "name", "parent", "head", "sort_order", "employee_count", "created_at"]
