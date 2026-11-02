"""Serializers for Course Catalog and Skills Mapping."""

from rest_framework import serializers

from apps.learning.models import Course, CourseSkill


class CourseSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill.name", read_only=True)
    category = serializers.CharField(source="skill.category", read_only=True)

    class Meta:
        model = CourseSkill
        fields = ["id", "skill", "skill_name", "category", "level_from", "level_to"]

    def validate(self, attrs):
        level_from = attrs.get("level_from", 1)
        level_to = attrs.get("level_to", 2)
        if level_from >= level_to:
            raise serializers.ValidationError("level_from must be strictly less than level_to.")
        return attrs


class CourseListSerializer(serializers.ModelSerializer):
    skills = CourseSkillSerializer(source="skill_mappings", many=True, read_only=True)
    enrollment_count = serializers.IntegerField(read_only=True)
    completion_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "provider",
            "provider_url",
            "description",
            "difficulty",
            "format",
            "duration_hours",
            "skills",
            "enrollment_count",
            "completion_rate",
            "created_at",
        ]


class CourseDetailSerializer(serializers.ModelSerializer):
    skills = CourseSkillSerializer(source="skill_mappings", many=True, read_only=True)
    enrollment_count = serializers.IntegerField(read_only=True)
    completion_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "provider",
            "provider_url",
            "description",
            "overview",
            "difficulty",
            "format",
            "duration_hours",
            "is_active",
            "skills",
            "enrollment_count",
            "completion_rate",
            "created_at",
            "updated_at",
        ]


class CourseCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = [
            "title",
            "provider",
            "provider_url",
            "description",
            "overview",
            "difficulty",
            "format",
            "duration_hours",
            "is_active",
        ]
