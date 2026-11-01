"""Authentication views — login, logout, password management, session info."""

from __future__ import annotations

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.exceptions import DomainException
from apps.core.permissions import HasRole
from apps.core.throttling import LoginRateThrottle, PasswordResetRateThrottle

from . import services
from .models import User
from .serializers import (
    LoginSerializer,
    MeSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PasswordResetValidateSerializer,
    UserManagementSerializer,
)


class LoginView(APIView):
    """POST /api/v1/auth/login/"""

    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = services.authenticate_user(
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )

        access_token, refresh_token = services.generate_tokens(user)

        response = Response(
            {
                "access": access_token,
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "role": user.role,
                },
                "must_change_password": user.must_change_password,
                "available_portals": user.available_portals,
            },
            status=status.HTTP_200_OK,
        )

        # Set refresh token as httpOnly cookie
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
            max_age=7 * 24 * 60 * 60,  # 7 days
        )

        return response


class LogoutView(APIView):
    """POST /api/v1/auth/logout/ — blacklists the refresh token and clears cookie."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        refresh_token = request.COOKIES.get("refresh_token") or request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass  # Token already blacklisted or invalid

        response = Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)
        response.delete_cookie("refresh_token")
        return response


class CookieTokenRefreshView(APIView):
    """
    POST /api/v1/auth/refresh/
    Reads refresh token from httpOnly cookie or request body.
    Rotates refresh token if rotation enabled, sets updated cookie.
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        raw_token = request.COOKIES.get("refresh_token") or request.data.get("refresh")
        if not raw_token:
            return Response(
                {
                    "error": {
                        "code": "authentication_failed",
                        "message": "Refresh token is missing.",
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(raw_token)
            access = str(refresh.access_token)

            data = {"access": access}

            response = Response(data, status=status.HTTP_200_OK)

            if getattr(settings, "SIMPLE_JWT", {}).get("ROTATE_REFRESH_TOKENS", True):
                refresh.set_jti()
                refresh.set_exp()
                new_refresh = str(refresh)
                response.set_cookie(
                    key="refresh_token",
                    value=new_refresh,
                    httponly=True,
                    secure=not settings.DEBUG,
                    samesite="Lax",
                    max_age=7 * 24 * 60 * 60,
                )

            return response
        except (TokenError, InvalidToken):
            return Response(
                {
                    "error": {
                        "code": "authentication_failed",
                        "message": "Refresh token is invalid or expired.",
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )


class MeView(APIView):
    """GET /api/v1/auth/me/ — returns current user profile and session config."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        serializer = MeSerializer(request.user, context={"request": request})
        return Response(serializer.data)


class PasswordResetRequestView(APIView):
    """POST /api/v1/auth/password/reset/ — rate limited, always returns 200."""

    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request: Request) -> Response:
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.create_password_reset_token(serializer.validated_data["email"])
        return Response(
            {
                "message": (
                    "If an account with that email exists, you will receive a password reset link."
                )
            }
        )


class PasswordResetValidateView(APIView):
    """POST /api/v1/auth/password/reset/validate/ — check token validity."""

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = PasswordResetValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            services.validate_password_reset_token(serializer.validated_data["token"])
            return Response({"valid": True})
        except DomainException:
            return Response(
                {"valid": False, "error": "invalid_token"}, status=status.HTTP_400_BAD_REQUEST
            )


class PasswordResetConfirmView(APIView):
    """POST /api/v1/auth/password/reset/confirm/"""

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.reset_password(
            token=serializer.validated_data["token"],
            new_password=serializer.validated_data["new_password"],
        )
        return Response({"message": "Password has been reset successfully."})


class PasswordChangeView(APIView):
    """POST /api/v1/auth/password/change/ — authenticated password change."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.change_password(
            user=request.user,
            current_password=serializer.validated_data["current_password"],
            new_password=serializer.validated_data["new_password"],
        )
        return Response({"message": "Password changed successfully."})


class PasswordPolicyView(APIView):
    """GET /api/v1/auth/password/policy/ — returns password policy rules for UI hints."""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        return Response(services.get_password_policy())


class UserListView(APIView):
    """GET /api/v1/users/?q=&role= (HR Admin only)"""

    permission_classes = [HasRole.hr_admin()]

    def get(self, request: Request) -> Response:
        qs = User.objects.all().order_by("-created_at")
        role_filter = request.query_params.get("role")
        if role_filter:
            qs = qs.filter(role=role_filter)
        q = request.query_params.get("q")
        if q:
            qs = qs.filter(email__icontains=q)

        serializer = UserManagementSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        from apps.employees.views import UserEmployeeCreateView

        return UserEmployeeCreateView().post(request)


class UserDetailView(APIView):
    """PATCH /api/v1/users/{id}/ (HR Admin only)"""

    permission_classes = [HasRole.hr_admin()]

    def patch(self, request: Request, pk) -> Response:
        try:
            target_user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "User not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_role = request.data.get("role")
        is_active = request.data.get("is_active")

        updated_user = services.update_user_role_and_status(
            user=target_user,
            actor=request.user,
            new_role=new_role,
            is_active=is_active,
            request=request,
        )

        return Response(UserManagementSerializer(updated_user).data)
