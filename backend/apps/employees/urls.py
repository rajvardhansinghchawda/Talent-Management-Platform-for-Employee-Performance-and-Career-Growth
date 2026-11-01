from django.urls import path

from . import views

urlpatterns = [
    path("", views.EmployeeListView.as_view(), name="employee-list"),
    path("me/", views.EmployeeMeView.as_view(), name="employee-me"),
    path("me/photo/", views.EmployeeMePhotoView.as_view(), name="employee-me-photo"),
    path(
        "import/template/",
        views.EmployeeImportTemplateView.as_view(),
        name="employee-import-template",
    ),
    path(
        "import/preview/", views.EmployeeImportPreviewView.as_view(), name="employee-import-preview"
    ),
    path("import/", views.EmployeeImportCommitView.as_view(), name="employee-import-commit"),
    path(
        "import/<uuid:job_id>/",
        views.EmployeeImportJobDetailView.as_view(),
        name="employee-import-job-detail",
    ),
    path("<uuid:pk>/", views.EmployeeDetailView.as_view(), name="employee-detail"),
    path("<uuid:pk>/team/", views.EmployeeTeamView.as_view(), name="employee-team"),
    path(
        "<uuid:pk>/change-manager/",
        views.EmployeeChangeManagerView.as_view(),
        name="employee-change-manager",
    ),
    path(
        "<uuid:pk>/manager-history/",
        views.EmployeeManagerHistoryView.as_view(),
        name="employee-manager-history",
    ),
    path(
        "<uuid:pk>/deactivate/", views.EmployeeDeactivateView.as_view(), name="employee-deactivate"
    ),
    path(
        "<uuid:pk>/reactivate/", views.EmployeeReactivateView.as_view(), name="employee-reactivate"
    ),
]
