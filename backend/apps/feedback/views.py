"""Views for Feedback, Recognition, and 1:1 Meetings."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.employees.selectors import get_employee_for_user
from apps.feedback.models import ActionItem, Badge, Feedback, FeedbackRequest, OneOnOne, Recognition


class FeedbackListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        emp = get_employee_for_user(request.user)
        if not emp:
            return Response([])

        feedbacks = Feedback.objects.filter(
            to_employee=emp
        ).exclude(visibility="PRIVATE_TO_MANAGER").select_related("from_user")

        data = [
            {
                "id": str(f.id),
                "type": f.feedback_type,
                "author": (f.from_user.get_full_name() or f.from_user.email) if f.from_user else "Colleague",
                "content": f.content,
                "created_at": f.created_at.isoformat(),
            }
            for f in feedbacks
        ]
        return Response(data)

    def post(self, request: Request) -> Response:
        emp = get_employee_for_user(request.user)
        req_from = request.data.get("requested_from")
        msg = request.data.get("message", "Requesting feedback on recent deliverables.")
        fr = FeedbackRequest.objects.create(
            requester=emp,
            target_user_id=req_from,
            message=msg,
        )
        return Response({"id": str(fr.id), "status": "REQUESTED"}, status=status.HTTP_201_CREATED)


class RecognitionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        emp = get_employee_for_user(request.user)
        scope = request.query_params.get("scope", "received")

        if scope == "wall":
            qs = Recognition.objects.select_related("badge", "from_employee", "to_employee")[:20]
        else:
            qs = Recognition.objects.filter(to_employee=emp).select_related("badge", "from_employee") if emp else []

        data = [
            {
                "id": str(r.id),
                "badge": {
                    "id": str(r.badge.id) if r.badge else "",
                    "name": r.badge.name if r.badge else "Excellence",
                    "icon": getattr(r.badge, "icon", "award"),
                },
                "from": {"name": r.from_employee.name if r.from_employee else "Team"},
                "to": {"name": r.to_employee.name if r.to_employee else "Team"},
                "message": r.message,
                "created_at": r.created_at.isoformat(),
            }
            for r in qs
        ]
        return Response(data)

    def post(self, request: Request) -> Response:
        emp = get_employee_for_user(request.user)
        to_emp_id = request.data.get("to_employee")
        badge_id = request.data.get("badge")
        msg = request.data.get("message", "Congratulations!")

        badge = Badge.objects.filter(pk=badge_id).first() or Badge.objects.first()
        rec = Recognition.objects.create(
            from_employee=emp,
            to_employee_id=to_emp_id,
            badge=badge,
            message=msg,
        )
        return Response({"id": str(rec.id)}, status=status.HTTP_201_CREATED)


class OneOnOneListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        emp = get_employee_for_user(request.user)
        if not emp:
            return Response({"meetings": [], "action_items": []})

        meetings = OneOnOne.objects.filter(employee=emp).select_related("manager")
        action_items = ActionItem.objects.filter(owner=emp)

        return Response({
            "meetings": [
                {
                    "id": str(m.id),
                    "with": m.manager.name if m.manager else "Manager",
                    "scheduled_at": m.scheduled_at.isoformat(),
                    "status": m.status,
                    "shared_notes": m.shared_notes,
                }
                for m in meetings
            ],
            "action_items": [
                {
                    "id": str(a.id),
                    "title": a.title,
                    "due_date": str(a.due_date) if a.due_date else None,
                    "status": a.status,
                }
                for a in action_items
            ],
        })
