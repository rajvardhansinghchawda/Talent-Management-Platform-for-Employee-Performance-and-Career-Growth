"""URLs for Notifications."""

from django.urls import path

from . import views

urlpatterns = [
    path("notifications/", views.NotificationListView.as_view(), name="notification-list"),
    path(
        "notifications/mark-all-read/",
        views.NotificationMarkAllReadView.as_view(),
        name="notification-mark-all-read",
    ),
    path(
        "notifications/<uuid:pk>/read/",
        views.NotificationMarkReadView.as_view(),
        name="notification-mark-read",
    ),
    path(
        "notifications/preferences/",
        views.NotificationPreferencesView.as_view(),
        name="notification-preferences",
    ),
]
