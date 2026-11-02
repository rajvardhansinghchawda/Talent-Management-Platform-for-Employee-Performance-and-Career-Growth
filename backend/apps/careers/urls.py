"""URLs for Career Paths, Readiness, and Development Plans."""

from django.urls import path

from . import views

urlpatterns = [
    path("careers/paths/", views.CareerPathGraphView.as_view(), name="career-paths"),
    path("careers/readiness/", views.CareerReadinessView.as_view(), name="career-readiness"),
    path("development-plans/", views.DevelopmentPlanListView.as_view(), name="development-plans"),
]
