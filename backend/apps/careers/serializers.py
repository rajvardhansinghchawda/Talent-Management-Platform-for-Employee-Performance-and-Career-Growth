from rest_framework import serializers

from .models import DevelopmentPlan, DevelopmentPlanItem, PromotionReviewFlag


class DevelopmentPlanSerializer(serializers.ModelSerializer):
    progress_pct = serializers.IntegerField(read_only=True)

    class Meta:
        model = DevelopmentPlan
        fields = "__all__"


class DevelopmentPlanItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = DevelopmentPlanItem
        fields = "__all__"


class PromotionReviewFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromotionReviewFlag
        fields = "__all__"
