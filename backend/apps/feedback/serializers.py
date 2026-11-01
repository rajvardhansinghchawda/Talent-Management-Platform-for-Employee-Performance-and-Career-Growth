from rest_framework import serializers

from .models import Badge, Feedback, OneOnOne, Recognition


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = "__all__"


class OneOnOneSerializer(serializers.ModelSerializer):
    class Meta:
        model = OneOnOne
        fields = "__all__"


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = "__all__"


class RecognitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recognition
        fields = "__all__"
