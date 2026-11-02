"""URLs for Feedback, Recognition, and 1:1 Meetings."""

from django.urls import path

from . import views

urlpatterns = [
    path("feedback/", views.FeedbackListView.as_view(), name="feedback-list"),
    path("feedback-requests/", views.FeedbackListView.as_view(), name="feedback-request-create"),
    path("recognitions/", views.RecognitionListView.as_view(), name="recognitions-list"),
    path("one-on-ones/", views.OneOnOneListView.as_view(), name="one-on-ones-list"),
]
