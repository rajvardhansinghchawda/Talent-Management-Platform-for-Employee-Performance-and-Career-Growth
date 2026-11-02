"""Views for Goals, Cycles, Progress Updates, Approvals, and Scores."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.constants import Role as UserRole
from apps.core.exceptions import DomainException
from apps.core.pagination import StandardPagination
from apps.core.permissions import HasRole
from apps.employees.selectors import get_employee_by_id, get_employee_for_user, reports_to_tree
from apps.performance import selectors, services
from apps.performance.models import Goal, GoalComment, PerformanceReview, ReviewStatus
from apps.performance.serializers import (
    CalibrationFinalizeSerializer,
    CalibrationProposalSerializer,
    CalibrationReviewItemSerializer,
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
    HRDashboardSerializer,
    ManagerReviewDraftSerializer,
    ManagerReviewSubmitSerializer,
    PerformanceReviewDetailSerializer,
    PerformanceReviewListSerializer,
    ReviewCycleCreateUpdateSerializer,
    ReviewCycleDetailSerializer,
    ReviewCycleSimpleSerializer,
    ReviewDisputeSerializer,
    ReviewHistoryEntrySerializer,
    ReviewReopenSerializer,
    SelfAssessmentDraftSerializer,
    SelfAssessmentSubmitSerializer,
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
    """List and create review cycles."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        mine = request.query_params.get("mine", "").lower() in ("true", "1")
        actor_emp = get_employee_for_user(request.user)
        cycles = selectors.list_review_cycles(mine=mine, employee=actor_emp)
        serializer = ReviewCycleSimpleSerializer(cycles, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.role != UserRole.HR_ADMIN:
            raise DomainException(
                "Only HR Admin can create review cycles.", code="permission_denied", status_code=403
            )
        serializer = ReviewCycleCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cycle = serializer.save()
        return Response(ReviewCycleDetailSerializer(cycle).data, status=status.HTTP_201_CREATED)


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


class HRDashboardView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request):
        try:
            data = selectors.get_hr_dashboard_data()
            serializer = HRDashboardSerializer(data)
            return Response(serializer.data)
        except Exception as e:
            import traceback

            traceback.print_exc()
            raise e


class EmployeeDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        emp = get_employee_for_user(request.user)
        if not emp:
            raise DomainException("Employee profile not found.", code="not_found", status_code=404)
        data = selectors.get_employee_dashboard_data(emp)
        return Response(data)


class ExecutiveDashboardView(APIView):
    permission_classes = [IsAuthenticated, HasRole.executive()]

    def get(self, request):
        data = selectors.get_executive_dashboard_data()
        return Response(data)


class EmployeeReviewsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        emp = get_employee_for_user(request.user)
        if not emp:
            raise DomainException("Employee profile not found.", code="not_found", status_code=404)
        reviews = (
            PerformanceReview.objects.filter(employee=emp)
            .select_related("cycle")
            .order_by("-cycle__start_date")
        )
        items = []
        for r in reviews:
            items.append(
                {
                    "id": str(r.id),
                    "cycle": {
                        "id": str(r.cycle.id),
                        "name": r.cycle.name,
                        "start_date": str(r.cycle.start_date),
                        "end_date": str(r.cycle.end_date),
                    },
                    "status": r.status,
                    "self_rating": r.self_rating,
                    "manager_rating": r.manager_rating
                    if r.status == ReviewStatus.COMPLETED
                    else None,
                    "calibrated_rating": r.calibrated_rating
                    if r.status == ReviewStatus.COMPLETED
                    else None,
                    "final_rating": r.final_rating if r.status == ReviewStatus.COMPLETED else None,
                    "manager_comments": r.manager_comments
                    if r.status == ReviewStatus.COMPLETED
                    else None,
                    "next_action": (
                        "START_SELF_ASSESSMENT"
                        if not r.self_assessment_submitted_at
                        else "VIEW_RESULT"
                        if r.status == ReviewStatus.COMPLETED
                        else "NONE"
                    ),
                }
            )
        return Response(items)


class ReviewCycleDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request, pk):
        cycle = selectors.get_review_cycle_by_id(pk)
        return Response(ReviewCycleDetailSerializer(cycle).data)

    def patch(self, request, pk):
        cycle = selectors.get_review_cycle_by_id(pk)
        serializer = ReviewCycleCreateUpdateSerializer(cycle, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(ReviewCycleDetailSerializer(updated).data)


class ReviewCycleBoardView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request, pk):
        board = selectors.get_review_cycle_board(pk)
        return Response(board)


class ReviewCycleOverdueView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request, pk):
        overdue = selectors.get_review_cycle_overdue(pk)
        return Response(overdue)


class ReviewCycleActivateView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def post(self, request, pk):
        cycle = selectors.get_review_cycle_by_id(pk)
        activated = services.activate_review_cycle(cycle, actor=request.user)
        return Response(ReviewCycleDetailSerializer(activated).data)


class ReviewCycleStartCalibrationView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def post(self, request, pk):
        cycle = selectors.get_review_cycle_by_id(pk)
        force = bool(request.data.get("force", False))
        calibrated = services.start_calibration_cycle(cycle, actor=request.user, force=force)
        return Response(ReviewCycleDetailSerializer(calibrated).data)


class ReviewCycleCloseView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def post(self, request, pk):
        cycle = selectors.get_review_cycle_by_id(pk)
        closed = services.close_review_cycle(cycle, actor=request.user)
        return Response(ReviewCycleDetailSerializer(closed).data)


class CalibrationReviewsView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request):
        cycle_id = request.query_params.get("cycle")
        dept_id = request.query_params.get("department")
        manager_id = request.query_params.get("manager")
        review_status = request.query_params.get("status")

        reviews = selectors.list_calibration_reviews(
            cycle_id=cycle_id,
            department_id=dept_id,
            manager_id=manager_id,
            status=review_status,
        )
        serializer = CalibrationReviewItemSerializer(reviews, many=True)
        return Response(serializer.data)


class CalibrationDistributionView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request):
        cycle_id = request.query_params.get("cycle")
        group_by = request.query_params.get("group_by", "department")
        data = selectors.get_calibration_distribution(cycle_id=cycle_id, group_by=group_by)
        return Response(data)


class ReviewProposeCalibrationView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def post(self, request, pk):
        review = selectors.get_performance_review_by_id(pk)
        serializer = CalibrationProposalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = services.propose_calibration(
            review=review,
            calibrated_rating=serializer.validated_data["calibrated_rating"],
            comment=serializer.validated_data["comment"],
            actor=request.user,
        )
        return Response(CalibrationReviewItemSerializer(updated).data)


class ReviewFinalizeCalibrationView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def post(self, request, pk):
        review = selectors.get_performance_review_by_id(pk)
        serializer = CalibrationFinalizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = services.finalize_calibration(
            review=review,
            final_rating=serializer.validated_data.get("final_rating"),
            comment=serializer.validated_data.get("comment", ""),
            actor=request.user,
        )
        return Response(CalibrationReviewItemSerializer(updated).data)


class ReviewReopenDisputeView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def post(self, request, pk):
        review = selectors.get_performance_review_by_id(pk)
        comment = request.data.get("comment", "")
        updated = services.reopen_dispute(review, comment=comment, actor=request.user)
        return Response(CalibrationReviewItemSerializer(updated).data)


# ─── Performance Review Views ─────────────────────────────────────────────────


def _get_and_authorize_review(review_id, user) -> PerformanceReview:
    """Retrieve review and enforce strict role-based visibility."""
    review = selectors.get_performance_review_by_id(review_id)
    if user.role == UserRole.HR_ADMIN or user.role == UserRole.EXECUTIVE:
        return review

    if user.role == UserRole.EMPLOYEE:
        if review.employee.user_id != user.id:
            raise DomainException(
                "Performance review not found.", code="not_found", status_code=404
            )
        return review

    if user.role == UserRole.MANAGER:
        if review.employee.user_id == user.id:
            return review
        if review.reviewer and review.reviewer.user_id == user.id:
            return review
        actor_emp = get_employee_for_user(user)
        if actor_emp and review.employee in set(reports_to_tree(actor_emp, include_self=False)):
            return review
        raise DomainException("Performance review not found.", code="not_found", status_code=404)

    raise DomainException("Performance review not found.", code="not_found", status_code=404)


class ReviewListView(APIView):
    """GET /api/v1/reviews/"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee_param = request.query_params.get("employee")
        scope = request.query_params.get("scope")
        cycle_id = request.query_params.get("cycle")
        status_param = request.query_params.get("status")
        q = request.query_params.get("q")

        reviews = selectors.list_reviews(
            actor=request.user,
            employee_param=employee_param,
            scope=scope,
            cycle_id=cycle_id,
            status=status_param,
            q=q,
        )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(reviews, request)
        if page is not None:
            serializer = PerformanceReviewListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = PerformanceReviewListSerializer(reviews, many=True)
        return Response(serializer.data)


class ReviewDetailView(APIView):
    """GET /api/v1/reviews/{id}/"""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        review = _get_and_authorize_review(pk, request.user)
        serializer = PerformanceReviewDetailSerializer(review, context={"request": request})
        return Response(serializer.data)


class ReviewGoalResultsView(APIView):
    """GET /api/v1/reviews/{id}/goal-results/ (wizard step 1)"""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        review = _get_and_authorize_review(pk, request.user)
        summary = services.get_employee_goals_score(review.employee, cycle_id=review.cycle_id)
        serializer = GoalScoreSummarySerializer(summary)
        return Response(serializer.data)


class ReviewSelfAssessmentDraftView(APIView):
    """PUT /api/v1/reviews/{id}/self-assessment/draft/"""

    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        review = _get_and_authorize_review(pk, request.user)
        if review.employee.user_id != request.user.id and request.user.role != UserRole.HR_ADMIN:
            raise DomainException("Forbidden.", code="forbidden", status_code=403)

        if review.status != ReviewStatus.SELF_ASSESSMENT:
            raise DomainException(
                f"Cannot save draft when status is {review.status}.",
                code="state_conflict",
                status_code=409,
            )

        serializer = SelfAssessmentDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review.self_assessment_draft = serializer.validated_data["draft"]
        review.save(update_fields=["self_assessment_draft", "updated_at"])
        return Response({"status": "draft_saved", "draft": review.self_assessment_draft})


class ReviewSelfAssessmentSubmitView(APIView):
    """POST /api/v1/reviews/{id}/self-assessment/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        review = _get_and_authorize_review(pk, request.user)
        serializer = SelfAssessmentSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated = services.transition_review(
            review=review,
            to_status=ReviewStatus.MANAGER_REVIEW,
            actor=request.user,
            data=serializer.validated_data,
        )
        return Response(
            PerformanceReviewDetailSerializer(updated, context={"request": request}).data
        )


class ReviewManagerReviewDraftView(APIView):
    """PUT /api/v1/reviews/{id}/manager-review/draft/"""

    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        review = _get_and_authorize_review(pk, request.user)
        is_mgr = review.reviewer and review.reviewer.user_id == request.user.id
        if not is_mgr and request.user.role != UserRole.HR_ADMIN:
            raise DomainException("Forbidden.", code="forbidden", status_code=403)

        if review.status != ReviewStatus.MANAGER_REVIEW:
            raise DomainException(
                f"Cannot save manager draft when status is {review.status}.",
                code="state_conflict",
                status_code=409,
            )

        serializer = ManagerReviewDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review.manager_draft = serializer.validated_data["draft"]
        review.save(update_fields=["manager_draft", "updated_at"])
        return Response({"status": "draft_saved", "draft": review.manager_draft})


class ReviewManagerReviewSubmitView(APIView):
    """POST /api/v1/reviews/{id}/manager-review/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        review = _get_and_authorize_review(pk, request.user)
        serializer = ManagerReviewSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated = services.transition_review(
            review=review,
            to_status=ReviewStatus.CALIBRATION,
            actor=request.user,
            data=serializer.validated_data,
        )
        return Response(
            PerformanceReviewDetailSerializer(updated, context={"request": request}).data
        )


class ReviewAcknowledgeView(APIView):
    """POST /api/v1/reviews/{id}/acknowledge/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        review = _get_and_authorize_review(pk, request.user)
        updated = services.transition_review(
            review=review,
            to_status=ReviewStatus.ACKNOWLEDGED,
            actor=request.user,
        )
        return Response(
            PerformanceReviewDetailSerializer(updated, context={"request": request}).data
        )


class ReviewDisputeView(APIView):
    """POST /api/v1/reviews/{id}/dispute/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        review = _get_and_authorize_review(pk, request.user)
        serializer = ReviewDisputeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated = services.transition_review(
            review=review,
            to_status=ReviewStatus.DISPUTED,
            actor=request.user,
            data=serializer.validated_data,
        )
        return Response(
            PerformanceReviewDetailSerializer(updated, context={"request": request}).data
        )


class ReviewReopenView(APIView):
    """POST /api/v1/reviews/{id}/reopen/"""

    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def post(self, request, pk):
        review = _get_and_authorize_review(pk, request.user)
        serializer = ReviewReopenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated = services.transition_review(
            review=review,
            to_status=ReviewStatus.CALIBRATION,
            actor=request.user,
            data=serializer.validated_data,
        )
        return Response(
            PerformanceReviewDetailSerializer(updated, context={"request": request}).data
        )


class ReviewCalibrationHistoryView(APIView):
    """GET /api/v1/reviews/{id}/calibration-history/"""

    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request, pk):
        review = _get_and_authorize_review(pk, request.user)
        entries = review.calibration_history.select_related("actor").all()
        serializer = ReviewHistoryEntrySerializer(entries, many=True)
        return Response(serializer.data)


class ReviewCycleActionPreviewView(APIView):
    """GET /api/v1/review-cycles/{id}/action-preview/?action=activate|start_calibration|close"""

    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request, pk):
        cycle = selectors.get_review_cycle_by_id(pk)
        action = request.query_params.get("action", "")
        preview = services.get_cycle_action_preview(cycle, action=action)
        return Response(preview)


class ReviewCycleRemindOverdueView(APIView):
    """POST /api/v1/review-cycles/{id}/remind-overdue/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from apps.performance.tasks import send_review_overdue_reminders

        count = send_review_overdue_reminders()
        return Response({"reminders_sent": count})


class ManagerDashboardView(APIView):
    permission_classes = [IsAuthenticated, HasRole.manager()]

    def get(self, request):
        data = selectors.get_manager_dashboard_data(request.user)
        return Response(data)


class ManagerTeamRosterView(APIView):
    permission_classes = [IsAuthenticated, HasRole.manager()]

    def get(self, request):
        q = request.query_params.get("q")
        role = request.query_params.get("role")
        review_status = request.query_params.get("review_status")
        roster = selectors.list_manager_team_roster(
            request.user, q=q, role=role, review_status=review_status
        )
        return Response(roster)


class ManagerTeamMemberOverviewView(APIView):
    permission_classes = [IsAuthenticated, HasRole.manager()]

    def get(self, request, pk):
        overview = selectors.get_manager_team_member_overview(request.user, pk)
        return Response(overview)
