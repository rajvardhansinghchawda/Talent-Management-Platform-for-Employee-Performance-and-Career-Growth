"""URLs for Course Catalog."""

from django.urls import path

from . import views

urlpatterns = [
    path("courses/", views.CourseListCreateView.as_view(), name="course-list-create"),
    path("courses/<uuid:pk>/", views.CourseDetailView.as_view(), name="course-detail"),
    path(
        "courses/<uuid:pk>/skills/",
        views.CourseSkillsMappingView.as_view(),
        name="course-skills-mapping",
    ),
    path(
        "learning/recommendations/",
        views.LearningRecommendationsView.as_view(),
        name="learning-recommendations",
    ),
    path(
        "enrollments/",
        views.EnrollmentListCreateView.as_view(),
        name="enrollments-list-create",
    ),
]
