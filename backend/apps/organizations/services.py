"""Organization domain services — settings management, branding, and department hierarchy."""

from __future__ import annotations

from apps.audit import services as audit_services
from apps.audit.models import AuditAction
from apps.core.exceptions import DomainException, StateConflict

from .models import Department, Organization
from .serializers import (
    CareerSettingsSerializer,
    GeneralSettingsSerializer,
    PerformanceSettingsSerializer,
    PrivacySettingsSerializer,
)

SETTINGS_SERIALIZERS = {
    "general": GeneralSettingsSerializer,
    "performance": PerformanceSettingsSerializer,
    "career": CareerSettingsSerializer,
    "privacy": PrivacySettingsSerializer,
}


def get_or_create_organization() -> Organization:
    """Retrieve the platform's organization instance or create default."""
    org = Organization.objects.first()
    if not org:
        org = Organization.objects.create(
            name="Acme Corporation",
            accent_color="#4F46E5",
            settings_general={"name": "Acme Corporation", "accent_color": "#4F46E5"},
            settings_performance={
                "rating_scale": [
                    {"value": 1, "label": "Needs Improvement", "anchor": "Below expectations"},
                    {"value": 2, "label": "Developing", "anchor": "Approaching expectations"},
                    {
                        "value": 3,
                        "label": "Meets Expectations",
                        "anchor": "Consistently meets expectations",
                    },
                    {
                        "value": 4,
                        "label": "Exceeds Expectations",
                        "anchor": "Frequently exceeds expectations",
                    },
                    {"value": 5, "label": "Outstanding", "anchor": "Role model performance"},
                ],
                "goal_score_cap": "1.0",
                "goal_approval_required": True,
            },
            settings_career={
                "readiness_thresholds": {
                    "ready_coverage": "0.80",
                    "near_coverage": "0.60",
                    "min_goal_score": "0.70",
                    "min_rating": 3,
                },
                "show_self_assessed_as_provisional": True,
                "target_role_scope": "PATH",
            },
            settings_privacy={
                "confidential_feedback_visibility": "HR_NONE",
                "ai_enabled": False,
                "retention_notes": "",
            },
        )
    return org


def update_organization_settings(
    group: str,
    data: dict,
    actor,
    request=None,
) -> dict:
    """
    Validate and update a specific settings group on the Organization model.
    Audits the change with before/after diffs.
    """
    serializer_class = SETTINGS_SERIALIZERS.get(group)
    if not serializer_class:
        raise DomainException(
            message=f"Invalid settings group '{group}'. Must be one of: {list(SETTINGS_SERIALIZERS.keys())}",
            details={"group": group},
        )

    serializer = serializer_class(data=data, partial=True)
    serializer.is_valid(raise_exception=True)
    validated_data = serializer.validated_data

    org = get_or_create_organization()
    field_name = f"settings_{group}"
    current_settings = getattr(org, field_name, {}) or {}

    before_snapshot = dict(current_settings)

    # Convert Decimals to string/float for JSON compatibility
    clean_data = {}
    for k, v in validated_data.items():
        if hasattr(v, "__iter__") and not isinstance(v, (str, dict)):
            clean_data[k] = [dict(item) if hasattr(item, "items") else item for item in v]
        elif hasattr(v, "items"):
            clean_data[k] = {ik: str(iv) if hasattr(iv, "as_tuple") else iv for ik, iv in v.items()}
        elif hasattr(v, "as_tuple"):
            clean_data[k] = str(v)
        else:
            clean_data[k] = v

    new_settings = {**current_settings, **clean_data}
    setattr(org, field_name, new_settings)

    if group == "general":
        if "name" in clean_data:
            org.name = clean_data["name"]
        if "accent_color" in clean_data:
            org.accent_color = clean_data["accent_color"]

    org.save()
    after_snapshot = dict(new_settings)

    audit_services.log(
        actor=actor,
        action=AuditAction.ORG_SETTINGS_CHANGED,
        entity=org,
        entity_label=f"Organization Settings: {group}",
        before=before_snapshot,
        after=after_snapshot,
        summary=f"Updated organization settings group '{group}'",
        request=request,
    )

    return {
        "group": group,
        "values": new_settings,
        "updated_at": org.updated_at.isoformat(),
        "updated_by": str(actor),
    }


def update_organization_logo(file, actor, request=None) -> str:
    """Validate and upload organization branding logo."""
    max_bytes = 2 * 1024 * 1024
    if file.size > max_bytes:
        raise DomainException(
            message="Logo file size exceeds the 2 MB limit.",
            details={"file_size": file.size, "max_size": max_bytes},
        )

    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if hasattr(file, "content_type") and file.content_type not in allowed_types:
        raise DomainException(
            message=f"Unsupported file type '{file.content_type}'. Must be PNG, JPEG, or WEBP.",
            details={"content_type": file.content_type},
        )

    org = get_or_create_organization()
    org.logo = file
    org.save(update_fields=["logo", "updated_at"])

    audit_services.log(
        actor=actor,
        action=AuditAction.ORG_SETTINGS_CHANGED,
        entity=org,
        entity_label="Organization Logo",
        summary="Uploaded new organization logo",
        request=request,
    )

    return org.logo_url or ""


# ─── Department Services ───────────────────────────────────────────────────────


def get_department_tree() -> list[dict]:
    """
    Returns hierarchical department tree:
    [{ id, name, head: {id, name}|null, employee_count, can_delete, children: [...] }]
    """
    all_depts = list(
        Department.objects.all()
        .select_related("head", "parent")
        .prefetch_related("employees", "children")
        .order_by("sort_order", "name")
    )

    children_map: dict[str, list] = {}

    for d in all_depts:
        parent_id = d.parent_id
        if parent_id not in children_map:
            children_map[parent_id] = []
        children_map[parent_id].append(d)

    def build_node(dept: Department) -> dict:
        children = [build_node(child) for child in children_map.get(dept.id, [])]
        emp_count = dept.employees.filter(is_active=True).count()
        can_delete = emp_count == 0 and len(children) == 0

        head_data = None
        if dept.head:
            head_data = {"id": str(dept.head.id), "name": dept.head.full_name}

        return {
            "id": str(dept.id),
            "name": dept.name,
            "head": head_data,
            "sort_order": dept.sort_order,
            "employee_count": emp_count,
            "can_delete": can_delete,
            "children": children,
        }

    # Roots have parent_id=None
    roots = children_map.get(None, [])
    return [build_node(root) for root in roots]


def validate_no_department_cycle(dept_id, new_parent_id) -> None:
    """Ensures setting new_parent does not cause a cycle in the department hierarchy."""
    if not new_parent_id:
        return
    if str(dept_id) == str(new_parent_id):
        raise StateConflict(
            message="A department cannot be its own parent.",
            details={"reason": "CYCLE_DETECTED"},
        )

    curr_id = new_parent_id
    visited = {str(dept_id)}

    while curr_id:
        if str(curr_id) in visited:
            raise StateConflict(
                message="Setting this parent creates a cycle in the department hierarchy.",
                details={"reason": "CYCLE_DETECTED"},
            )
        visited.add(str(curr_id))
        parent_dept = (
            Department.objects.filter(id=curr_id).values_list("parent_id", flat=True).first()
        )
        curr_id = parent_dept


def delete_department(dept: Department, actor, request=None) -> None:
    """
    Deletes department if it has no active employees and no sub-departments.
    Raises StateConflict (409) with counts otherwise.
    """
    emp_count = dept.employees.filter(is_active=True).count()
    if emp_count > 0:
        raise StateConflict(
            message=f"Department cannot be deleted because it contains {emp_count} active employee(s).",
            details={"reason": "HAS_EMPLOYEES", "employee_count": emp_count},
        )

    children_count = dept.children.count()
    if children_count > 0:
        raise StateConflict(
            message=f"Department cannot be deleted because it contains {children_count} sub-department(s).",
            details={"reason": "HAS_CHILDREN", "children_count": children_count},
        )

    dept_name = dept.name
    dept_id = str(dept.id)
    dept.delete()

    audit_services.log(
        actor=actor,
        action=AuditAction.ORG_SETTINGS_CHANGED,
        entity=dept,
        entity_id=dept_id,
        entity_label=f"Department: {dept_name}",
        summary=f"Deleted department '{dept_name}'",
        request=request,
    )
