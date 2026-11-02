from rest_framework import serializers

from apps.accounts.models import User
from apps.organizations.models import Department
from apps.skills.models import JobRole

from .models import Employee, ManagerHistory
from .role_history import EmployeeRoleHistory


class EmployeeDirectorySerializer(serializers.ModelSerializer):
    """Limited public fields for organization directory."""

    name = serializers.CharField(source="full_name", read_only=True)
    designation = serializers.CharField(read_only=True)
    department = serializers.CharField(source="department.name", read_only=True)
    manager = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = ["id", "name", "photo_url", "designation", "department", "manager"]

    def get_manager(self, obj):
        if obj.manager:
            return {"id": str(obj.manager.id), "name": obj.manager.full_name}
        return None


class ManagerHistorySerializer(serializers.ModelSerializer):
    manager_name = serializers.CharField(source="manager.full_name", read_only=True)
    changed_by_email = serializers.CharField(source="changed_by.email", read_only=True)

    class Meta:
        model = ManagerHistory
        fields = [
            "id",
            "manager",
            "manager_name",
            "effective_date",
            "changed_by",
            "changed_by_email",
            "reason",
            "created_at",
        ]


class EmployeeRoleHistorySerializer(serializers.ModelSerializer):
    from_role_title = serializers.CharField(source="from_role.title", read_only=True)
    to_role_title = serializers.CharField(source="to_role.title", read_only=True)

    class Meta:
        model = EmployeeRoleHistory
        fields = [
            "id",
            "from_role",
            "from_role_title",
            "to_role",
            "to_role_title",
            "effective_date",
            "changed_by",
            "reason",
            "created_at",
        ]


class EmployeeDetailSerializer(serializers.ModelSerializer):
    """Detailed employee view with performance and career summaries."""

    name = serializers.CharField(source="full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)
    designation = serializers.CharField(read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    manager_name = serializers.CharField(source="manager.full_name", read_only=True)
    editable_fields = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            "id",
            "employee_code",
            "first_name",
            "last_name",
            "preferred_name",
            "name",
            "email",
            "role",
            "bio",
            "photo_url",
            "phone",
            "location",
            "department",
            "department_name",
            "job_role",
            "designation",
            "manager",
            "manager_name",
            "target_role",
            "joining_date",
            "employment_status",
            "is_active",
            "editable_fields",
            "created_at",
            "updated_at",
        ]

    def get_editable_fields(self, obj):
        return ["preferred_name", "phone", "bio"]


class EmployeeSelfUpdateSerializer(serializers.ModelSerializer):
    """Employee self-service update serializer (strict whitelist)."""

    class Meta:
        model = Employee
        fields = ["preferred_name", "phone", "bio"]

    def validate(self, attrs):
        # Disallow unexpected fields
        unknown_keys = set(self.initial_data.keys()) - {"preferred_name", "phone", "bio"}
        if unknown_keys:
            raise serializers.ValidationError(
                f"You are only allowed to edit preferred_name, phone, and bio. Disallowed fields: {list(unknown_keys)}"
            )
        return attrs


class UserEmployeeCreateSerializer(serializers.Serializer):
    """Atomic User and Employee onboarding serializer."""

    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=["EMPLOYEE", "MANAGER", "HR_ADMIN", "EXECUTIVE"])
    credential_mode = serializers.ChoiceField(choices=["INVITE", "TEMP_PASSWORD"])

    # Employee profile fields
    employee_code = serializers.CharField(max_length=50)
    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    preferred_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    location = serializers.CharField(max_length=100, required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), required=False, allow_null=True
    )
    job_role = serializers.PrimaryKeyRelatedField(
        queryset=JobRole.objects.all(), required=False, allow_null=True
    )
    manager = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), required=False, allow_null=True
    )
    joining_date = serializers.DateField(required=False, allow_null=True)

    def to_internal_value(self, data):
        if isinstance(data, dict) and "employee" in data and isinstance(data["employee"], dict):
            emp_data = data["employee"]
            data = data.copy() if hasattr(data, "copy") else dict(data)
            for k, v in emp_data.items():
                if k not in data or not data[k]:
                    data[k] = v
        return super().to_internal_value(data)

    def validate(self, attrs):
        if not attrs.get("first_name"):
            pref = attrs.get("preferred_name") or attrs.get("email", "").split("@")[0]
            parts = pref.split(" ", 1)
            attrs["first_name"] = parts[0]
            if len(parts) > 1 and not attrs.get("last_name"):
                attrs["last_name"] = parts[1]
            elif not attrs.get("last_name"):
                attrs["last_name"] = "Employee"
        return attrs

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_employee_code(self, value):
        if Employee.objects.filter(employee_code=value).exists():
            raise serializers.ValidationError("An employee with this employee code already exists.")
        return value


class ChangeManagerSerializer(serializers.Serializer):
    manager = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.filter(is_active=True), allow_null=True
    )
    effective_date = serializers.DateField()
    reason = serializers.CharField(required=False, allow_blank=True)
