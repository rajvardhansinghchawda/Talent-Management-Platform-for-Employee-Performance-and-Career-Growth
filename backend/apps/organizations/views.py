"""Organization views — organization details, settings groups, logo management."""

from __future__ import annotations

from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import HasRole

from . import services
from .serializers import OrganizationSerializer


class OrganizationDetailView(APIView):
    """GET /api/v1/organization/ — returns general organization information."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        org = services.get_or_create_organization()
        return Response(OrganizationSerializer(org).data)


class OrganizationSettingsView(APIView):
    """GET /api/v1/organization/settings/ — returns all settings groups (HR Admin only)."""

    permission_classes = [HasRole.hr_admin()]

    def get(self, request: Request) -> Response:
        org = services.get_or_create_organization()
        return Response(
            {
                "general": {
                    "values": org.settings_general,
                    "updated_at": org.updated_at.isoformat(),
                },
                "performance": {
                    "values": org.settings_performance,
                    "updated_at": org.updated_at.isoformat(),
                },
                "career": {
                    "values": org.settings_career,
                    "updated_at": org.updated_at.isoformat(),
                },
                "privacy": {
                    "values": org.settings_privacy,
                    "updated_at": org.updated_at.isoformat(),
                },
            }
        )


class OrganizationSettingsGroupView(APIView):
    """PATCH /api/v1/organization/settings/{group}/ — update a specific settings group."""

    permission_classes = [HasRole.hr_admin()]

    def patch(self, request: Request, group: str) -> Response:
        result = services.update_organization_settings(
            group=group,
            data=request.data,
            actor=request.user,
            request=request,
        )
        return Response(result, status=status.HTTP_200_OK)


class OrganizationLogoUploadView(APIView):
    """POST /api/v1/organization/logo/ — upload organization branding logo."""

    permission_classes = [HasRole.hr_admin()]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request: Request) -> Response:
        file_obj = request.FILES.get("logo")
        if not file_obj:
            return Response(
                {"error": {"code": "validation_error", "message": "No logo file provided."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logo_url = services.update_organization_logo(
            file=file_obj,
            actor=request.user,
            request=request,
        )
        return Response({"logo_url": logo_url}, status=status.HTTP_200_OK)
