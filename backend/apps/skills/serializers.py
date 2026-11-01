from rest_framework import serializers

from .models import JobRole, Skill, SkillAssessment


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = "__all__"


class JobRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobRole
        fields = "__all__"


class SkillAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillAssessment
        fields = "__all__"
