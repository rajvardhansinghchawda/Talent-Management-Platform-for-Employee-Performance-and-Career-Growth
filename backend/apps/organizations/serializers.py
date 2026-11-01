from rest_framework import serializers

from .models import Department, Organization


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = "__all__"


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Department
        fields = ["id", "name", "parent", "head", "sort_order", "employee_count", "created_at"]
