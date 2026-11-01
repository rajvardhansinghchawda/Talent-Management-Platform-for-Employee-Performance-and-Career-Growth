"""URLs for Performance app: Goals, Review Cycles, Updates, Scoring, and Alignment."""

from django.urls import path

from . import views

urlpatterns = [
    # Cycles
    path("review-cycles/", views.ReviewCycleListView.as_view(), name="review-cycles-list"),
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
