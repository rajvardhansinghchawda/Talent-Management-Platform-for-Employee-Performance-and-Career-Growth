from rest_framework import serializers

from .models import AIRequestLog


class AIRequestLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIRequestLog
        fields = "__all__"
