"""Audit service — centralized audit logging function."""

from __future__ import annotations

from django.http import HttpRequest

from .models import AuditLog


def log(
    actor,
    action: str,
    entity,
    entity_type: str | None = None,
    entity_label: str = "",
    before: dict | None = None,
    after: dict | None = None,
    summary: str = "",
    request: HttpRequest | None = None,
) -> AuditLog:
    """
    Create an append-only audit log entry.

    Args:
        actor: The User who performed the action.
        action: An AuditAction constant string.
        entity: The model instance being acted upon. Can be a model or a plain dict with id/label.
        entity_type: Override for entity type name.
        entity_label: Human-readable label for the entity.
        before: Snapshot of the entity before the change (no secrets).
        after: Snapshot of the entity after the change (no secrets).
        summary: Plain-text summary of the action.
        request: The original HTTP request (for IP/user-agent extraction).
    """
    # Derive entity info
    if entity_type is None:
        entity_type = type(entity).__name__

    if hasattr(entity, "pk"):
        entity_id = str(entity.pk)
    elif isinstance(entity, dict):
        entity_id = str(entity.get("id", ""))
    else:
        entity_id = str(entity)

    if not entity_label and hasattr(entity, "__str__"):
        entity_label = str(entity)[:255]

    # Compute field-level changes if both snapshots provided
    changes = None
    if before and after:
        changes = [
            {"field": k, "before": before.get(k), "after": after.get(k)}
            for k in set(list(before.keys()) + list(after.keys()))
            if before.get(k) != after.get(k)
        ]

    # Extract request metadata
    ip_address = None
    user_agent = ""
    if request:
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded:
            ip_address = x_forwarded.split(",")[0].strip()
        else:
            ip_address = request.META.get("REMOTE_ADDR")
        user_agent = request.META.get("HTTP_USER_AGENT", "")[:500]

    return AuditLog.objects.create(
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_label=entity_label,
        summary=summary,
        before=before,
        after=after,
        changes=changes,
        ip_address=ip_address,
        user_agent=user_agent,
    )
