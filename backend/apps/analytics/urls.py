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
    # Team Analytics for Managers
    path(
        "analytics/team/goal-progress-distribution/",
        views.TeamGoalProgressDistributionView.as_view(),
        name="analytics-team-goal-progress",
    ),
    path(
        "analytics/team/rating-trend/",
        views.TeamRatingTrendView.as_view(),
        name="analytics-team-rating-trend",
    ),
    path(
        "analytics/team/skill-heatmap/",
        views.TeamSkillHeatmapView.as_view(),
        name="analytics-team-skill-heatmap",
    ),
    path(
        "analytics/team/training-completion/",
        views.TeamTrainingCompletionView.as_view(),
        name="analytics-team-training-completion",
    ),
    # Executive Analytics Endpoints
    path(
        "analytics/executive/rating-distribution/",
        views.ExecutiveRatingDistributionView.as_view(),
        name="analytics-exec-rating-distribution",
    ),
    path(
        "analytics/executive/rating-trend/",
        views.ExecutiveRatingTrendView.as_view(),
        name="analytics-exec-rating-trend",
    ),
    path(
        "analytics/executive/department-comparison/",
        views.ExecutiveDepartmentComparisonView.as_view(),
        name="analytics-exec-dept-comparison",
    ),
    path(
        "analytics/executive/goal-achievement/",
        views.ExecutiveGoalAchievementView.as_view(),
        name="analytics-exec-goal-achievement",
    ),
    path(
        "analytics/executive/skill-heatmap/",
        views.ExecutiveSkillHeatmapView.as_view(),
        name="analytics-exec-skill-heatmap",
    ),
    path(
        "analytics/executive/shortage-ranking/",
        views.ExecutiveShortageRankingView.as_view(),
        name="analytics-exec-shortage-ranking",
    ),
    path(
        "analytics/executive/training-effectiveness/",
        views.ExecutiveTrainingEffectivenessView.as_view(),
        name="analytics-exec-training-effectiveness",
    ),
    path(
        "analytics/executive/focus-areas/",
        views.ExecutiveFocusAreasView.as_view(),
        name="analytics-exec-focus-areas",
    ),
    path(
        "analytics/executive/readiness-summary/",
        views.ExecutiveReadinessSummaryView.as_view(),
        name="analytics-exec-readiness-summary",
    ),
    path(
        "analytics/executive/bench-strength/",
        views.ExecutiveBenchStrengthView.as_view(),
        name="analytics-exec-bench-strength",
    ),
    path(
        "analytics/executive/nine-box/",
        views.ExecutiveNineBoxView.as_view(),
        name="analytics-exec-nine-box",
    ),
    path(
        "analytics/executive/mobility-trends/",
        views.ExecutiveMobilityTrendsView.as_view(),
        name="analytics-exec-mobility-trends",
    ),
]
