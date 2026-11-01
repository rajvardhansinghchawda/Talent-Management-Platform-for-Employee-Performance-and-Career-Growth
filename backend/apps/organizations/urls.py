from django.urls import path

from . import views

urlpatterns = [
    path("organization/", views.OrganizationDetailView.as_view(), name="organization-detail"),
    path(
        "organization/settings/",
        views.OrganizationSettingsView.as_view(),
        name="organization-settings",
    ),
    path(
        "organization/settings/<str:group>/",
        views.OrganizationSettingsGroupView.as_view(),
        name="organization-settings-group",
    ),
    path(
        "organization/logo/",
        views.OrganizationLogoUploadView.as_view(),
        name="organization-logo",
    ),
]
