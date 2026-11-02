"""Serializers for Audit Logs."""

from rest_framework import serializers

from apps.audit.models import AuditLog


class AuditLogListSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.get_full_name", default=None, read_only=True)
    actor_email = serializers.EmailField(source="actor.email", default=None, read_only=True)
    entity = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "created_at",
            "actor_name",
            "actor_email",
            "action",
            "entity",
            "summary",
        ]

    def get_entity(self, obj: AuditLog) -> dict[str, str]:
        return {
            "type": obj.entity_type,
            "id": obj.entity_id,
            "label": obj.entity_label,
        }


class AuditLogDetailSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.get_full_name", default=None, read_only=True)
    actor_email = serializers.EmailField(source="actor.email", default=None, read_only=True)
    entity = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "created_at",
            "actor_name",
            "actor_email",
            "action",
            "entity",
            "summary",
            "before",
            "after",
            "changes",
            "ip_address",
            "user_agent",
        ]

    def get_entity(self, obj: AuditLog) -> dict[str, str]:
        return {
            "type": obj.entity_type,
            "id": obj.entity_id,
            "label": obj.entity_label,
        }
