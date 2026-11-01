from .models import AuditLog


def list_audit_logs(actor=None, action=None, entity_type=None, entity_id=None):
    qs = AuditLog.objects.all().select_related("actor")
    if actor:
        qs = qs.filter(actor=actor)
    if action:
        qs = qs.filter(action=action)
    if entity_type:
        qs = qs.filter(entity_type=entity_type)
    if entity_id:
        qs = qs.filter(entity_id=entity_id)
    return qs
