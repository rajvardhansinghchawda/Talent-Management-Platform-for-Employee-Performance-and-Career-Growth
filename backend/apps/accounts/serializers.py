from rest_framework import serializers

from apps.organizations.models import Organization

from .models import User

DEFAULT_RATING_SCALE = [
    {"value": 1, "label": "Needs Improvement", "anchor": "Consistently below expectations"},
    {"value": 2, "label": "Developing", "anchor": "Partially meets expectations"},
    {"value": 3, "label": "Meets Expectations", "anchor": "Consistently meets expectations"},
    {"value": 4, "label": "Exceeds Expectations", "anchor": "Frequently surpasses expectations"},
    {"value": 5, "label": "Outstanding", "anchor": "Exceptional role-model performance"},
]


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class MeSerializer(serializers.ModelSerializer):
    available_portals = serializers.ListField(read_only=True)
    employee = serializers.SerializerMethodField()
    organization = serializers.SerializerMethodField()
    ai_enabled = serializers.SerializerMethodField()
    rating_scale = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "role",
            "must_change_password",
            "available_portals",
            "employee",
            "organization",
            "ai_enabled",
            "rating_scale",
        ]

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

    def get_organization(self, obj):
        org = Organization.objects.first()
        if org:
            return {
                "id": str(org.id),
                "name": org.name,
                "logo_url": org.logo_url,
                "accent_color": org.accent_color,
            }
        return {
            "id": None,
            "name": "Acme Talent",
            "logo_url": None,
            "accent_color": "#4F46E5",
        }

    def get_ai_enabled(self, obj):
        org = Organization.objects.first()
        if org and org.settings_privacy:
            return bool(org.settings_privacy.get("ai_enabled", False))
        return False

    def get_rating_scale(self, obj):
        org = Organization.objects.first()
        if org and org.settings_performance and "rating_scale" in org.settings_performance:
            return org.settings_performance["rating_scale"]
        return DEFAULT_RATING_SCALE


class UserManagementSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    is_last_hr_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "role",
            "is_active",
            "must_change_password",
            "name",
            "is_last_hr_admin",
            "created_at",
        ]
        read_only_fields = ["id", "email", "created_at"]

    def get_name(self, obj):
        if hasattr(obj, "employee_profile"):
            return obj.employee_profile.full_name
        return obj.email.split("@")[0]

    def get_is_last_hr_admin(self, obj):
        if obj.role == "HR_ADMIN" and obj.is_active:
            return User.objects.filter(role="HR_ADMIN", is_active=True).count() <= 1
        return False


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
