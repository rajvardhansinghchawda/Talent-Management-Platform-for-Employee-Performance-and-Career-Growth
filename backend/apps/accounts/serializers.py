from rest_framework import serializers

from .models import User


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class MeSerializer(serializers.ModelSerializer):
    available_portals = serializers.ListField(read_only=True)
    employee = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "role", "must_change_password", "available_portals", "employee"]

    def get_employee(self, obj):
        if hasattr(obj, "employee_profile"):
            emp = obj.employee_profile
            return {
                "id": str(emp.id),
                "name": emp.full_name,
                "preferred_name": emp.preferred_name or emp.full_name,
                "photo_url": emp.photo_url,
                "designation": emp.designation,
                "department": emp.department.name if emp.department else None,
            }
        return None


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetValidateSerializer(serializers.Serializer):
    token = serializers.CharField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8, write_only=True)


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)
