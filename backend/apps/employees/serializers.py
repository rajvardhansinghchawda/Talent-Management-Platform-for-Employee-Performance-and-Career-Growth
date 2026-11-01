from rest_framework import serializers

from .models import Employee


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    designation = serializers.CharField(read_only=True)
    photo_url = serializers.CharField(read_only=True)

    class Meta:
        model = Employee
        fields = "__all__"
