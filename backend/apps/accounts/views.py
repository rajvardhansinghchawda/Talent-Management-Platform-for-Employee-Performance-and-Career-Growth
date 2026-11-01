"""Authentication views — login, logout, password management, session info."""

from __future__ import annotations

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.exceptions import DomainException

from . import services
from .serializers import (
    LoginSerializer,
    MeSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PasswordResetValidateSerializer,
)


class LoginView(APIView):
    """POST /api/v1/auth/login/"""

    permission_classes = [AllowAny]
    throttle_scope = "login"

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
    """POST /api/v1/auth/logout/ — blacklists the refresh token."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        refresh_token = request.COOKIES.get("refresh_token")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass  # Already invalid is fine

        response = Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)
        response.delete_cookie("refresh_token")
        return response


class MeView(APIView):
    """GET /api/v1/auth/me/ — returns current user profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        serializer = MeSerializer(request.user, context={"request": request})
        return Response(serializer.data)


class PasswordResetRequestView(APIView):
    """POST /api/v1/auth/password/reset/ — always returns 200 to prevent enumeration."""

    permission_classes = [AllowAny]
    throttle_scope = "password_reset"

    def post(self, request: Request) -> Response:
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Fire-and-forget; always returns 200 regardless of whether email exists
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
