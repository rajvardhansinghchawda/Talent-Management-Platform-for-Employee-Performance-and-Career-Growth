"""URLs for Careers and Development Plans."""

from django.urls import path

from . import views

urlpatterns = [
    path("development-plans/", views.DevelopmentPlanListView.as_view(), name="development-plans-list"),
    path(
        "development-plans/<uuid:pk>/approve/",
        views.DevelopmentPlanApproveView.as_view(),
        name="development-plan-approve",
    ),
    path(
        "development-plans/<uuid:pk>/reject/",
        views.DevelopmentPlanRejectView.as_view(),
        name="development-plan-reject",
    ),
    path(
        "development-plans/<uuid:pk>/assign-course/",
        views.DevelopmentPlanAssignCourseView.as_view(),
        name="development-plan-assign-course",
    ),
    path("careers/promotion-flags/", views.PromotionReviewFlagView.as_view(), name="promotion-flag-create"),
    path("careers/paths/", views.CareerPathGraphView.as_view(), name="career-paths"),
    path("careers/readiness/", views.CareerReadinessView.as_view(), name="career-readiness"),
]
