from rest_framework import serializers

from .models import Goal, PerformanceReview, ReviewCycle


class ReviewCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewCycle
        fields = "__all__"


class GoalSerializer(serializers.ModelSerializer):
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Goal
        fields = "__all__"


class PerformanceReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceReview
        fields = "__all__"
