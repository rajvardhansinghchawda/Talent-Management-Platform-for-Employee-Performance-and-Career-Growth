"""URLs for HR Analytics."""

from django.urls import path

from . import views

urlpatterns = [
    # Performance Tab
    path(
        "analytics/performance/rating-distribution/",
        views.PerformanceRatingDistributionView.as_view(),
        name="analytics-performance-distribution",
    ),
    path(
        "analytics/performance/trend/",
        views.PerformanceTrendView.as_view(),
        name="analytics-performance-trend",
    ),
    # Skills Tab
    path(
        "analytics/skills/heatmap/",
        views.SkillsHeatmapView.as_view(),
        name="analytics-skills-heatmap",
    ),
    path(
        "analytics/skills/shortages/",
        views.SkillsShortagesView.as_view(),
        name="analytics-skills-shortages",
    ),
    # Training Tab
    path(
        "analytics/training/completion/",
        views.TrainingCompletionView.as_view(),
        name="analytics-training-completion",
    ),
    path(
        "analytics/training/effectiveness/",
        views.TrainingEffectivenessView.as_view(),
        name="analytics-training-effectiveness",
    ),
    # Readiness Tab
    path(
        "analytics/readiness/by-role/",
        views.ReadinessByRoleView.as_view(),
        name="analytics-readiness-by-role",
    ),
    path(
        "analytics/readiness/mobility-pipeline/",
        views.ReadinessMobilityPipelineView.as_view(),
        name="analytics-readiness-mobility-pipeline",
    ),
    # Nine-Box Tab
    path(
        "analytics/nine-box/",
        views.NineBoxMatrixView.as_view(),
        name="analytics-nine-box",
    ),
]
