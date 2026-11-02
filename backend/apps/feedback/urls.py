"""URLs for Feedback and 1:1 Meetings."""

from django.urls import path

from . import views

urlpatterns = [
    # Feedback
    path("feedback/", views.FeedbackListView.as_view(), name="feedback-list"),
    path(
        "feedback-requests/",
        views.FeedbackRequestListCreateView.as_view(),
        name="feedback-request-list",
    ),
    path(
        "feedback/visibility-options/",
        views.FeedbackVisibilityOptionsView.as_view(),
        name="feedback-visibility-options",
    ),
    path("recognitions/", views.RecognitionListCreateView.as_view(), name="recognition-create"),
    # 1:1 Meetings
    path("one-on-ones/", views.OneOnOneListView.as_view(), name="one-on-one-list"),
    path("one-on-ones/<uuid:pk>/", views.OneOnOneDetailView.as_view(), name="one-on-one-detail"),
    path(
        "one-on-ones/<uuid:pk>/action-items/",
        views.ActionItemListCreateView.as_view(),
        name="one-on-one-action-items",
    ),
]
