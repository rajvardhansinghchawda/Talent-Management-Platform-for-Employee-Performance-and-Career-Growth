"""URLs for Reports."""

from django.urls import path

from . import views

urlpatterns = [
    path("reports/types/", views.ReportTypesListView.as_view(), name="report-types-list"),
    path("reports/", views.ReportJobListView.as_view(), name="report-jobs-list"),
    path("reports/<uuid:pk>/", views.ReportJobDetailView.as_view(), name="report-job-detail"),
    path(
        "reports/<uuid:pk>/retry/",
        views.ReportJobRetryView.as_view(),
        name="report-job-retry",
    ),
    path("reports/catalog/", views.ExecutiveReportsCatalogView.as_view(), name="reports-catalog"),
]
