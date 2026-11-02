"""Views for In-App Notifications and Preferences."""

import uuid

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import Notification, NotificationCategory, NotificationPreference


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        is_read_param = request.query_params.get("is_read")
        category = request.query_params.get("category")

        qs = Notification.objects.filter(recipient=request.user)
        if is_read_param is not None:
            is_read = is_read_param.lower() in ("true", "1")
            qs = qs.filter(is_read=is_read)
        if category:
            qs = qs.filter(category=category)

        # Seed some demo notifications if none exist
        if not qs.exists():
            Notification.objects.create(
                recipient=request.user,
                category=NotificationCategory.CYCLE_STARTED,
                title="H2 2026 Annual Performance Cycle Active",
                body="The annual review cycle is now active. Please complete your self-assessment by the due date.",
                link="/employee/reviews/",
                is_read=False,
            )
            Notification.objects.create(
                recipient=request.user,
                category=NotificationCategory.FEEDBACK_RECEIVED,
                title="New Feedback Received",
                body="Vikram Malhotra left new feedback on your technical ownership.",
                link="/employee/feedback/",
                is_read=False,
            )
            Notification.objects.create(
                recipient=request.user,
                category=NotificationCategory.GOAL_DECISION,
                title="Goal Deliverable Approved",
                body="Your goal 'Deliver High-Performance Goals Backend APIs' was approved.",
                link="/employee/goals/",
                is_read=True,
                read_at=timezone.now(),
            )
            qs = Notification.objects.filter(recipient=request.user)

        data = [
            {
                "id": str(n.id),
                "category": n.category,
                "title": n.title,
                "body": n.body,
                "link": n.link,
                "is_read": n.is_read,
                "read_at": n.read_at.isoformat() if n.read_at else None,
                "created_at": n.created_at.isoformat(),
            }
            for n in qs
        ]
        return Response(data)


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: uuid.UUID) -> Response:
        try:
            n = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "Notification not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        n.is_read = True
        n.read_at = timezone.now()
        n.save(update_fields=["is_read", "read_at"])
        return Response({"id": str(n.id), "is_read": True})


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        Notification.objects.filter(recipient=request.user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return Response({"status": "success", "message": "All notifications marked as read."})


class NotificationPreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        prefs = NotificationPreference.objects.filter(user=request.user)
        if not prefs.exists():
            # Populate default preferences
            for cat in [
                NotificationCategory.CYCLE_STARTED,
                NotificationCategory.REVIEW_DUE,
                NotificationCategory.GOAL_DECISION,
                NotificationCategory.FEEDBACK_RECEIVED,
                NotificationCategory.RECOGNITION_RECEIVED,
                NotificationCategory.COURSE_ASSIGNED,
            ]:
                NotificationPreference.objects.get_or_create(
                    user=request.user,
                    category=cat,
                    defaults={"email_enabled": True, "in_app_enabled": True},
                )
            prefs = NotificationPreference.objects.filter(user=request.user)

        data = [
            {
                "category": p.category,
                "category_label": p.category.replace("_", " ").title(),
                "email_enabled": p.email_enabled,
                "in_app_enabled": p.in_app_enabled,
            }
            for p in prefs
        ]
        return Response(data)

    def patch(self, request: Request) -> Response:
        items = request.data.get("preferences", [])
        for item in items:
            cat = item.get("category")
            if cat:
                NotificationPreference.objects.update_or_create(
                    user=request.user,
                    category=cat,
                    defaults={
                        "email_enabled": item.get("email_enabled", True),
                        "in_app_enabled": item.get("in_app_enabled", True),
                    },
                )
        return self.get(request)
