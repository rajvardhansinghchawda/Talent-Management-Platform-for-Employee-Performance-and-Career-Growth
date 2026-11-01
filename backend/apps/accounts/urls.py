from django.urls import path

from . import views

urlpatterns = [
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("refresh/", views.CookieTokenRefreshView.as_view(), name="token-refresh"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    path("password/reset/", views.PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "password/reset/validate/",
        views.PasswordResetValidateView.as_view(),
        name="password-reset-validate",
    ),
    path(
        "password/reset/confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    path("password/change/", views.PasswordChangeView.as_view(), name="password-change"),
    path("password/policy/", views.PasswordPolicyView.as_view(), name="password-policy"),
]
