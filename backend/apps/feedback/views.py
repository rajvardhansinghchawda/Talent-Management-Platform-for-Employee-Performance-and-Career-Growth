"""Views for Feedback, 1:1 Meetings, and Recognitions."""

import uuid

from django.db import models
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import NotFound
from apps.employees.selectors import get_employee_by_id, get_employee_for_user, reports_to_tree
from apps.feedback.models import ActionItem, Badge, Feedback, FeedbackRequest, OneOnOne, Recognition
from apps.feedback.serializers import (
    ActionItemSerializer,
    FeedbackCreateSerializer,
    FeedbackItemSerializer,
    FeedbackRequestSerializer,
    OneOnOneSerializer,
    RecognitionSerializer,
)


class FeedbackListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        scope = request.query_params.get("scope")
        to_emp_id = request.query_params.get("to_employee")

        qs = Feedback.objects.select_related("from_user", "to_employee").all()
        emp = get_employee_for_user(request.user)

        if scope == "team" and request.user.role == "MANAGER":
            if emp:
                subordinates = reports_to_tree(emp, include_self=False)
                qs = qs.filter(to_employee__in=subordinates)
            else:
                return Response([])
        elif request.user.role == "EMPLOYEE":
            if emp:
                qs = qs.filter(
                    models.Q(to_employee=emp, visibility__in=["EMPLOYEE_VISIBLE", "MANAGER_AND_EMPLOYEE"])
                    | models.Q(from_user=request.user)
                )
            else:
                return Response([])

        if to_emp_id:
            qs = qs.filter(to_employee_id=to_emp_id)

        serializer = FeedbackItemSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        serializer = FeedbackCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        fb = serializer.save(from_user=request.user)
        return Response(FeedbackItemSerializer(fb).data, status=status.HTTP_201_CREATED)


class FeedbackRequestListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        emp = get_employee_for_user(request.user)
        if not emp:
            return Response([])
        qs = FeedbackRequest.objects.filter(
            models.Q(requester=emp) | models.Q(requested_from=request.user)
        ).select_related("requester", "requested_from")
        serializer = FeedbackRequestSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        emp = get_employee_for_user(request.user)
        if not emp:
            raise NotFound(message="Employee profile not found.")

        target_emp_or_user_id = request.data.get("requested_from")
        target_user = None
        # Try finding employee first
        target_emp = get_employee_by_id(target_emp_or_user_id)
        if target_emp and target_emp.user:
            target_user = target_emp.user
        else:
            from django.contrib.auth import get_user_model
            user_model = get_user_model()
            target_user = user_model.objects.filter(id=target_emp_or_user_id).first()

        if not target_user:
            raise NotFound(message="Colleague not found.")

        freq = FeedbackRequest.objects.create(
            requester=emp,
            requested_from=target_user,
            message=request.data.get("message", ""),
            status="OPEN",
        )
        return Response(FeedbackRequestSerializer(freq).data, status=status.HTTP_201_CREATED)


class FeedbackVisibilityOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response([
            {"value": "EMPLOYEE_VISIBLE", "label": "Visible to Employee", "help": "Employee can see this feedback directly on their portal."},
            {"value": "MANAGER_AND_EMPLOYEE", "label": "Manager and Employee", "help": "Visible to the employee and direct reporting chain."},
            {"value": "PRIVATE_TO_MANAGER", "label": "Private to Manager", "help": "Confidential note visible only to you and HR administrators."},
        ])


class OneOnOneListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        when = request.query_params.get("when")
        scope = request.query_params.get("scope")
        emp = get_employee_for_user(request.user)

        if not emp:
            if request.user.role == "EMPLOYEE":
                return Response({"meetings": [], "action_items": []})
            return Response([])

        if request.user.role == "EMPLOYEE" and scope != "team":
            qs = OneOnOne.objects.filter(employee=emp).select_related("employee", "manager").prefetch_related("action_items")
            action_items_qs = ActionItem.objects.filter(owner=emp)

            meetings_data = []
            for m in qs:
                meetings_data.append({
                    "id": str(m.id),
                    "with": m.manager.name if m.manager else "Manager",
                    "scheduled_at": m.scheduled_at.isoformat() if m.scheduled_at else None,
                    "status": m.status,
                    "shared_notes": m.shared_notes,
                })

            action_items_data = []
            for ai in action_items_qs:
                action_items_data.append({
                    "id": str(ai.id),
                    "title": ai.title,
                    "due_date": ai.due_date.isoformat() if ai.due_date else None,
                    "status": ai.status,
                })

            return Response({
                "meetings": meetings_data,
                "action_items": action_items_data,
            })

        qs = OneOnOne.objects.filter(manager=emp).select_related("employee", "manager").prefetch_related("action_items")
        if when == "upcoming":
            qs = qs.filter(scheduled_at__gte=timezone.now())
        elif when == "past":
            qs = qs.filter(scheduled_at__lt=timezone.now())

        serializer = OneOnOneSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        mgr_emp = get_employee_for_user(request.user)
        emp_id = request.data.get("employee")
        emp = get_employee_by_id(emp_id)
        if not emp:
            raise NotFound(message="Employee not found.")

        meeting = OneOnOne.objects.create(
            manager=mgr_emp,
            employee=emp,
            scheduled_at=request.data.get("scheduled_at"),
            status="SCHEDULED",
            shared_notes=request.data.get("shared_notes", ""),
            private_notes=request.data.get("private_notes", ""),
        )
        return Response(OneOnOneSerializer(meeting, context={"request": request}).data, status=status.HTTP_201_CREATED)


class OneOnOneDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request: Request, pk: uuid.UUID) -> Response:
        try:
            meeting = OneOnOne.objects.get(pk=pk)
        except OneOnOne.DoesNotExist:
            raise NotFound(message="1:1 meeting not found.")

        shared_notes = request.data.get("shared_notes")
        private_notes = request.data.get("private_notes")
        status_val = request.data.get("status")

        if shared_notes is not None:
            meeting.shared_notes = shared_notes
        if private_notes is not None:
            meeting.private_notes = private_notes
        if status_val is not None:
            meeting.status = status_val

        meeting.save()
        return Response(OneOnOneSerializer(meeting, context={"request": request}).data)


class ActionItemListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: uuid.UUID) -> Response:
        try:
            meeting = OneOnOne.objects.get(pk=pk)
        except OneOnOne.DoesNotExist:
            raise NotFound(message="Meeting not found.")

        owner_id = request.data.get("owner")
        owner = get_employee_by_id(owner_id) or meeting.employee

        item = ActionItem.objects.create(
            one_on_one=meeting,
            owner=owner,
            title=request.data.get("title", ""),
            due_date=request.data.get("due_date"),
            status=request.data.get("status", "IN_PROGRESS"),
        )
        return Response(ActionItemSerializer(item).data, status=status.HTTP_201_CREATED)


class RecognitionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        scope = request.query_params.get("scope")
        emp = get_employee_for_user(request.user)

        qs = Recognition.objects.select_related("from_employee", "to_employee", "badge").all()
        if scope == "received" and emp:
            qs = qs.filter(to_employee=emp)
        elif scope == "given" and emp:
            qs = qs.filter(from_employee=emp)

        serializer = RecognitionSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        emp = get_employee_for_user(request.user)
        to_emp = get_employee_by_id(request.data.get("to_employee"))
        if not to_emp:
            raise NotFound(message="Recipient employee not found.")

        badge_name = request.data.get("badge_name")
        badge = None
        if badge_name:
            badge = Badge.objects.filter(name=badge_name).first()
        if not badge:
            badge = Badge.objects.first()
        if not badge:
            badge = Badge.objects.create(name="Excellence", icon="Award", description="Outstanding achievement")

        rec = Recognition.objects.create(
            from_employee=emp,
            to_employee=to_emp,
            badge=badge,
            message=request.data.get("message", "Great work!"),
        )
        return Response(RecognitionSerializer(rec).data, status=status.HTTP_201_CREATED)
