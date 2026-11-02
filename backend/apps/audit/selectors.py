"""Selectors for Audit Logs."""

import uuid

from django.db.models import Q, QuerySet

from apps.audit.models import AuditLog
from apps.core.exceptions import NotFound


def list_audit_logs(
    actor_id: uuid.UUID | None = None,
    action: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    q: str | None = None,
) -> QuerySet[AuditLog]:
    qs = AuditLog.objects.select_related("actor").all()
    if actor_id:
        qs = qs.filter(actor_id=actor_id)
    if action:
        qs = qs.filter(action=action)
    if entity_type:
        qs = qs.filter(entity_type__iexact=entity_type)
    if entity_id:
        qs = qs.filter(entity_id=entity_id)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to)
    if q:
        qs = qs.filter(
            Q(summary__icontains=q) | Q(entity_label__icontains=q) | Q(actor__email__icontains=q)
        )
    return qs.order_by("-created_at")


def get_audit_log_by_id(log_id: uuid.UUID) -> AuditLog:
    try:
        return AuditLog.objects.select_related("actor").get(pk=log_id)
    except AuditLog.DoesNotExist:
        raise NotFound(message="Audit log entry not found.")
