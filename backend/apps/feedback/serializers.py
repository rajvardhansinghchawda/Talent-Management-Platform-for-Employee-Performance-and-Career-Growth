"""Serializers for Feedback, Badges, Recognitions, 1:1 Meetings, and Action Items."""

from rest_framework import serializers

from apps.feedback.models import ActionItem, Badge, Feedback, FeedbackRequest, OneOnOne, Recognition


class FeedbackItemSerializer(serializers.ModelSerializer):
    from_name = serializers.SerializerMethodField()
    author = serializers.SerializerMethodField()
    to_name = serializers.CharField(source="to_employee.name", read_only=True)
    visibility_label = serializers.SerializerMethodField()
    type = serializers.CharField(source="feedback_type", read_only=True)

    class Meta:
        model = Feedback
        fields = [
            "id",
            "from_user",
            "from_name",
            "author",
            "to_employee",
            "to_name",
            "feedback_type",
            "type",
            "visibility",
            "visibility_label",
            "content",
            "created_at",
        ]

    def get_from_name(self, obj: Feedback) -> str:
        if obj.is_anonymous:
            return "Anonymous"
        if obj.from_user:
            emp = getattr(obj.from_user, "employee_profile", None)
            if emp:
                return emp.name
            return obj.from_user.get_full_name() or obj.from_user.email
        return "Anonymous"

    def get_author(self, obj: Feedback) -> str:
        return self.get_from_name(obj)

    def get_visibility_label(self, obj: Feedback) -> str:
        if obj.visibility == "PRIVATE_TO_MANAGER":
            return "Private to Manager"
        if obj.visibility == "EMPLOYEE_VISIBLE":
            return "Visible to Employee"
        return "Shared with Manager & Employee"


class FeedbackCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ["to_employee", "feedback_type", "visibility", "content"]


class FeedbackRequestSerializer(serializers.ModelSerializer):
    requester_name = serializers.CharField(source="requester.name", read_only=True)
    requested_from_name = serializers.CharField(source="requested_from.email", read_only=True)

    class Meta:
        model = FeedbackRequest
        fields = ["id", "requester", "requester_name", "requested_from", "requested_from_name", "message", "status", "created_at"]


class ActionItemSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.name", read_only=True)

    class Meta:
        model = ActionItem
        fields = ["id", "one_on_one", "owner", "owner_name", "title", "due_date", "status"]


class OneOnOneSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.name", read_only=True)
    employee_code = serializers.CharField(source="employee.employee_code", read_only=True)
    manager_name = serializers.CharField(source="manager.name", read_only=True)
    action_items = ActionItemSerializer(many=True, read_only=True)
    private_notes_visible_to_you = serializers.BooleanField(default=True, read_only=True)

    class Meta:
        model = OneOnOne
        fields = [
            "id",
            "manager",
            "manager_name",
            "employee",
            "employee_name",
            "employee_code",
            "scheduled_at",
            "status",
            "shared_notes",
            "private_notes",
            "private_notes_visible_to_you",
            "action_items",
            "created_at",
        ]

    def to_representation(self, instance: OneOnOne):
        data = super().to_representation(instance)
        # Security invariant: Never expose private_notes to the employee
        request = self.context.get("request")
        if request and request.user.role == "EMPLOYEE":
            data.pop("private_notes", None)
            data["private_notes_visible_to_you"] = False
        return data


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ["id", "name", "icon", "description"]


class RecognitionSerializer(serializers.ModelSerializer):
    from_name = serializers.CharField(source="from_employee.name", read_only=True)
    to_name = serializers.CharField(source="to_employee.name", read_only=True)
    badge_name = serializers.CharField(source="badge.name", read_only=True)
    badge = BadgeSerializer(read_only=True)
    from_user = serializers.SerializerMethodField()
    to = serializers.SerializerMethodField()

    class Meta:
        model = Recognition
        fields = ["id", "from_name", "to_name", "from_user", "to", "badge", "badge_name", "message", "created_at"]

    def get_from_user(self, obj: Recognition):
        return {"name": obj.from_employee.name if obj.from_employee else "Anonymous"}

    def get_to(self, obj: Recognition):
        return {"name": obj.to_employee.name if obj.to_employee else "Colleague"}

    def to_representation(self, instance: Recognition):
        data = super().to_representation(instance)
        data["from"] = data.pop("from_user", {"name": data.get("from_name", "")})
        return data
