"""URLs for Performance app: Goals, Review Cycles, Updates, Scoring, and Alignment."""

from django.urls import path

from . import views

urlpatterns = [
    # Dashboard
    path("dashboards/hr/", views.HRDashboardView.as_view(), name="hr-dashboard"),
    path("dashboards/employee/", views.EmployeeDashboardView.as_view(), name="employee-dashboard"),
    path(
        "dashboards/executive/", views.ExecutiveDashboardView.as_view(), name="executive-dashboard"
    ),
    path("dashboards/manager/", views.ManagerDashboardView.as_view(), name="manager-dashboard"),
    path("manager/team/", views.ManagerTeamRosterView.as_view(), name="manager-team-roster"),
    path(
        "manager/team/<uuid:pk>/overview/",
        views.ManagerTeamMemberOverviewView.as_view(),
        name="manager-team-member-overview",
    ),
    path(
        "dashboards/employee/reviews/",
        views.EmployeeReviewsListView.as_view(),
        name="employee-reviews-list",
    ),
    # Review Cycles
    path("review-cycles/", views.ReviewCycleListView.as_view(), name="review-cycles-list"),
    path(
        "review-cycles/<uuid:pk>/",
        views.ReviewCycleDetailView.as_view(),
        name="review-cycle-detail",
    ),
    path(
        "review-cycles/<uuid:pk>/board/",
        views.ReviewCycleBoardView.as_view(),
        name="review-cycle-board",
    ),
    path(
        "review-cycles/<uuid:pk>/overdue/",
        views.ReviewCycleOverdueView.as_view(),
        name="review-cycle-overdue",
    ),
    path(
        "review-cycles/<uuid:pk>/activate/",
        views.ReviewCycleActivateView.as_view(),
        name="review-cycle-activate",
    ),
    path(
        "review-cycles/<uuid:pk>/start-calibration/",
        views.ReviewCycleStartCalibrationView.as_view(),
        name="review-cycle-start-calibration",
    ),
    path(
        "review-cycles/<uuid:pk>/close/",
        views.ReviewCycleCloseView.as_view(),
        name="review-cycle-close",
    ),
    path(
        "review-cycles/<uuid:pk>/action-preview/",
        views.ReviewCycleActionPreviewView.as_view(),
        name="review-cycle-action-preview",
    ),
    path(
        "review-cycles/<uuid:pk>/remind-overdue/",
        views.ReviewCycleRemindOverdueView.as_view(),
        name="review-cycle-remind-overdue",
    ),
    # Performance Reviews
    path("reviews/", views.ReviewListView.as_view(), name="reviews-list"),
    path("reviews/<uuid:pk>/", views.ReviewDetailView.as_view(), name="reviews-detail"),
    path(
        "reviews/<uuid:pk>/goal-results/",
        views.ReviewGoalResultsView.as_view(),
        name="reviews-goal-results",
    ),
    path(
        "reviews/<uuid:pk>/self-assessment/draft/",
        views.ReviewSelfAssessmentDraftView.as_view(),
        name="reviews-self-assessment-draft",
    ),
    path(
        "reviews/<uuid:pk>/self-assessment/",
        views.ReviewSelfAssessmentSubmitView.as_view(),
        name="reviews-self-assessment-submit",
    ),
    path(
        "reviews/<uuid:pk>/manager-review/draft/",
        views.ReviewManagerReviewDraftView.as_view(),
        name="reviews-manager-review-draft",
    ),
    path(
        "reviews/<uuid:pk>/manager-review/",
        views.ReviewManagerReviewSubmitView.as_view(),
        name="reviews-manager-review-submit",
    ),
    path(
        "reviews/<uuid:pk>/acknowledge/",
        views.ReviewAcknowledgeView.as_view(),
        name="reviews-acknowledge",
    ),
    path(
        "reviews/<uuid:pk>/dispute/",
        views.ReviewDisputeView.as_view(),
        name="reviews-dispute",
    ),
    path(
        "reviews/<uuid:pk>/calibration-history/",
        views.ReviewCalibrationHistoryView.as_view(),
        name="reviews-calibration-history",
    ),
    # Calibration
    path(
        "calibration/reviews/",
        views.CalibrationReviewsView.as_view(),
        name="calibration-reviews",
    ),
    path(
        "calibration/distribution/",
        views.CalibrationDistributionView.as_view(),
        name="calibration-distribution",
    ),
    path(
        "reviews/<uuid:pk>/propose-calibration/",
        views.ReviewProposeCalibrationView.as_view(),
        name="review-propose-calibration",
    ),
    path(
        "reviews/<uuid:pk>/finalize/",
        views.ReviewFinalizeCalibrationView.as_view(),
        name="review-finalize-calibration",
    ),
    path(
        "reviews/<uuid:pk>/reopen/",
        views.ReviewReopenDisputeView.as_view(),
        name="review-reopen-dispute",
    ),
    # Goals collection & calculations
    path("goals/", views.GoalListCreateView.as_view(), name="goals-list-create"),
    path("goals/score/", views.GoalScoreSummaryView.as_view(), name="goals-score-summary"),
    path("goals/alignment/", views.GoalAlignmentTreeView.as_view(), name="goals-alignment-tree"),
    # Goal instance actions
    path("goals/<uuid:pk>/", views.GoalDetailView.as_view(), name="goals-detail"),
    path("goals/<uuid:pk>/submit/", views.GoalSubmitView.as_view(), name="goals-submit"),
    path("goals/<uuid:pk>/approve/", views.GoalApproveView.as_view(), name="goals-approve"),
    path("goals/<uuid:pk>/reject/", views.GoalRejectView.as_view(), name="goals-reject"),
    path("goals/<uuid:pk>/updates/", views.GoalUpdatesView.as_view(), name="goals-updates"),
    path("goals/<uuid:pk>/complete/", views.GoalCompleteView.as_view(), name="goals-complete"),
    path("goals/<uuid:pk>/alignment/", views.GoalAlignmentView.as_view(), name="goals-alignment"),
    path("goals/<uuid:pk>/comments/", views.GoalCommentsView.as_view(), name="goals-comments"),
]
