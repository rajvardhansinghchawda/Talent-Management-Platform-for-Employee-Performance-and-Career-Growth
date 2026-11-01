from django.urls import path

from apps.employees.views import UserEmployeeCreateView

from . import views

urlpatterns = [
    path("", views.UserListView.as_view(), name="user-list"),
    path("create/", UserEmployeeCreateView.as_view(), name="user-employee-create"),
    path("<uuid:pk>/", views.UserDetailView.as_view(), name="user-detail"),
]
