"""Views for Audit Logs."""

import uuid

from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit import selectors
from apps.audit.serializers import AuditLogDetailSerializer, AuditLogListSerializer
from apps.core.pagination import StandardPagination
from apps.core.permissions import HasRole


class AuditLogListView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]
    pagination_class = StandardPagination

    def get(self, request: Request) -> Response:
        actor_raw = request.query_params.get("actor")
        actor_id = uuid.UUID(actor_raw) if actor_raw else None
        action = request.query_params.get("action")
        entity_type = request.query_params.get("entity_type")
        entity_id = request.query_params.get("entity_id")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        q = request.query_params.get("q")

        logs = selectors.list_audit_logs(
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            date_from=date_from,
            date_to=date_to,
            q=q,
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(logs, request)
        if page is not None:
            serializer = AuditLogListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = AuditLogListSerializer(logs, many=True)
        return Response(serializer.data)


class AuditLogDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request, pk: uuid.UUID) -> Response:
        log = selectors.get_audit_log_by_id(pk)
        return Response(AuditLogDetailSerializer(log).data)
