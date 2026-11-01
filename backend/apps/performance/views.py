"""Views for Goals, Cycles, Progress Updates, Approvals, and Scores."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import UserRole
from apps.core.exceptions import DomainException
from apps.core.pagination import StandardPagination
from apps.employees.selectors import get_employee_by_id, get_employee_for_user, reports_to_tree
from apps.performance import selectors, services
from apps.performance.models import Goal, GoalComment
from apps.performance.serializers import (
    GoalApprovalSerializer,
    GoalCommentItemSerializer,
    GoalCompleteSerializer,
    GoalCreateSerializer,
    GoalDetailSerializer,
    GoalListSerializer,
    GoalProgressUpdateItemSerializer,
    GoalRejectionSerializer,
    GoalScoreSummarySerializer,
    GoalUpdateProgressSerializer,
    GoalUpdateSerializer,
    ReviewCycleSimpleSerializer,
)


def _get_and_authorize_goal(goal_id, user, write: bool = False) -> Goal:
    """Retrieve goal and enforce strict tenant/hierarchy visibility."""
    goal = selectors.get_goal_by_id(goal_id)
    if not goal:
        raise DomainException("Goal not found.", code="not_found", status_code=404)

    if user.role == UserRole.HR_ADMIN:
        return goal

    if user.role == UserRole.EMPLOYEE:
        if goal.owner.user_id != user.id:
            raise DomainException("Goal not found.", code="not_found", status_code=404)
        return goal

    if user.role == UserRole.MANAGER:
        if goal.owner.user_id == user.id:
            return goal
        manager_emp = get_employee_for_user(user)
        if manager_emp:
            subordinates = set(reports_to_tree(manager_emp, include_self=False))
            if goal.owner in subordinates:
                return goal
        raise DomainException("Goal not found.", code="not_found", status_code=404)

    if user.role == UserRole.EXECUTIVE:
        if write:
            raise DomainException("Forbidden.", code="forbidden", status_code=403)
        return goal

    raise DomainException("Goal not found.", code="not_found", status_code=404)


class ReviewCycleListView(APIView):
    """List review cycles (for selectors and cycle dropdowns)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        mine = request.query_params.get("mine", "").lower() in ("true", "1")
        actor_emp = get_employee_for_user(request.user)
        cycles = selectors.list_review_cycles(mine=mine, employee=actor_emp)
        serializer = ReviewCycleSimpleSerializer(cycles, many=True)
        return Response(serializer.data)


class GoalListCreateView(APIView):
    """
    GET /api/v1/goals/
    POST /api/v1/goals/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        scope = request.query_params.get("scope")
        employee_param = request.query_params.get("employee")
        cycle_id = request.query_params.get("cycle")
        status_param = request.query_params.get("status")
        for_parent = request.query_params.get("for_parent", "").lower() in ("true", "1")
        q = request.query_params.get("q")
        ordering = request.query_params.get("ordering")

        goals = selectors.list_goals(
            actor=request.user,
            scope=scope,
            employee_param=employee_param,
            cycle_id=cycle_id,
            status=status_param,
            for_parent=for_parent,
            q=q,
            ordering=ordering,
        )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(goals, request)
        if page is not None:
            serializer = GoalListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = GoalListSerializer(goals, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = GoalCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        goal = services.create_goal(serializer.validated_data, actor=request.user)
        return Response(GoalDetailSerializer(goal).data, status=status.HTTP_201_CREATED)


class GoalDetailView(APIView):
    """
    GET /api/v1/goals/{id}/
    PATCH /api/v1/goals/{id}/
    DELETE /api/v1/goals/{id}/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        goal = _get_and_authorize_goal(pk, request.user, write=False)
        return Response(GoalDetailSerializer(goal).data)

    def patch(self, request, pk):
        goal = _get_and_authorize_goal(pk, request.user, write=True)

        if request.user.role == UserRole.EMPLOYEE and goal.owner.user_id != request.user.id:
            raise DomainException("Forbidden.", code="forbidden", status_code=403)

        serializer = GoalUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = services.update_goal(goal, serializer.validated_data, actor=request.user)
        return Response(GoalDetailSerializer(updated).data)

    def delete(self, request, pk):
        goal = _get_and_authorize_goal(pk, request.user, write=True)

        if goal.status != "DRAFT" and request.user.role != UserRole.HR_ADMIN:
            raise DomainException(
                "Only DRAFT goals can be deleted.",
                code="state_conflict",
                status_code=409,
            )

        goal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GoalSubmitView(APIView):
    """POST /api/v1/goals/{id}/submit/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        goal = _get_and_authorize_goal(pk, request.user, write=True)
        submitted = services.submit_goal_for_approval(goal, actor=request.user)
        return Response(GoalDetailSerializer(submitted).data)


class GoalApproveView(APIView):
    """POST /api/v1/goals/{id}/approve/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        goal = _get_and_authorize_goal(pk, request.user, write=True)
        serializer = GoalApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.validated_data.get("comment", "")
        approved = services.approve_goal(goal, actor=request.user, comment=comment)
        return Response(GoalDetailSerializer(approved).data)


class GoalRejectView(APIView):
    """POST /api/v1/goals/{id}/reject/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        goal = _get_and_authorize_goal(pk, request.user, write=True)
        serializer = GoalRejectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rejected = services.reject_goal(
            goal, actor=request.user, comment=serializer.validated_data["comment"]
        )
        return Response(GoalDetailSerializer(rejected).data)


class GoalUpdatesView(APIView):
    """
    GET /api/v1/goals/{id}/updates/
    POST /api/v1/goals/{id}/updates/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        goal = _get_and_authorize_goal(pk, request.user, write=False)
        updates = selectors.list_goal_updates(goal)
        serializer = GoalProgressUpdateItemSerializer(updates, many=True)
        return Response(serializer.data)

    def post(self, request, pk):
        goal = _get_and_authorize_goal(pk, request.user, write=True)
        serializer = GoalUpdateProgressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        update = services.add_goal_progress_update(
            goal=goal,
            actor=request.user,
            value=serializer.validated_data["value"],
            note=serializer.validated_data.get("note", ""),
            evidence_url=serializer.validated_data.get("evidence_url", ""),
        )
        return Response(
            GoalProgressUpdateItemSerializer(update).data,
            status=status.HTTP_201_CREATED,
        )


class GoalCompleteView(APIView):
    """POST /api/v1/goals/{id}/complete/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        goal = _get_and_authorize_goal(pk, request.user, write=True)
        serializer = GoalCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        completed = services.complete_goal(
            goal, actor=request.user, note=serializer.validated_data.get("note", "")
        )
        return Response(GoalDetailSerializer(completed).data)


class GoalAlignmentView(APIView):
    """GET /api/v1/goals/{id}/alignment/"""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        goal = _get_and_authorize_goal(pk, request.user, write=False)
        data = services.get_goal_alignment(goal)
        return Response(data)


class GoalAlignmentTreeView(APIView):
    """GET /api/v1/goals/alignment/"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        scope = request.query_params.get("scope")
        cycle_id = request.query_params.get("cycle")
        forest = selectors.get_alignment_forest(actor=request.user, scope=scope, cycle_id=cycle_id)
        return Response(forest)


class GoalCommentsView(APIView):
    """
    GET /api/v1/goals/{id}/comments/
    POST /api/v1/goals/{id}/comments/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        goal = _get_and_authorize_goal(pk, request.user, write=False)
        comments = selectors.list_goal_comments(goal)
        serializer = GoalCommentItemSerializer(comments, many=True)
        return Response(serializer.data)

    def post(self, request, pk):
        goal = _get_and_authorize_goal(pk, request.user, write=True)
        text = request.data.get("text", "").strip()
        if not text:
            raise DomainException(
                "Comment text is required.",
                code="validation_error",
                status_code=400,
                details={"text": ["Comment cannot be empty."]},
            )

        comment = GoalComment.objects.create(
            goal=goal,
            author=request.user,
            kind=GoalComment.Kind.NOTE,
            text=text,
        )
        return Response(
            GoalCommentItemSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )


class GoalScoreSummaryView(APIView):
    """GET /api/v1/goals/score/"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee_param = request.query_params.get("employee")
        cycle_id = request.query_params.get("cycle")

        actor_emp = get_employee_for_user(request.user)

        if not employee_param or employee_param == "me":
            if not actor_emp:
                raise DomainException(
                    "Employee profile not found.", code="not_found", status_code=404
                )
            target = actor_emp
        else:
            target = get_employee_by_id(employee_param)
            if not target:
                raise DomainException("Employee not found.", code="not_found", status_code=404)

            # Check authorization to view target's score
            if request.user.role == UserRole.EMPLOYEE:
                if target != actor_emp:
                    raise DomainException("Employee not found.", code="not_found", status_code=404)
            elif request.user.role == UserRole.MANAGER:
                if actor_emp:
                    subordinates = set(reports_to_tree(actor_emp, include_self=True))
                    if target not in subordinates:
                        raise DomainException(
                            "Employee not found.", code="not_found", status_code=404
                        )
                else:
                    raise DomainException("Employee not found.", code="not_found", status_code=404)

        result = services.get_employee_goals_score(target, cycle_id=cycle_id)
        serializer = GoalScoreSummarySerializer(result)
        return Response(serializer.data)
