from django.urls import include, path

urlpatterns = [
    path("auth/", include("apps.accounts.urls")),
    path("users/", include("apps.accounts.user_urls")),
    path("", include("apps.organizations.urls")),
    path("employees/", include("apps.employees.urls")),
    path("", include("apps.performance.urls")),
    path("", include("apps.skills.urls")),
    path("", include("apps.learning.urls")),
    path("", include("apps.careers.urls")),
    path("", include("apps.feedback.urls")),
    path("", include("apps.notifications.urls")),
    path("", include("apps.analytics.urls")),
    path("", include("apps.audit.urls")),
    path("", include("apps.reports.urls")),
]
