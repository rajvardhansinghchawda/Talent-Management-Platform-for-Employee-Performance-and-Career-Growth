"""Organization and Settings endpoint tests."""

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.audit.models import AuditAction, AuditLog
from apps.organizations.models import Organization


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def hr_user(db):
    return User.objects.create_user(
        email="hr_settings@example.com",
        password="StrongPass1!",
        role="HR_ADMIN",
    )


@pytest.fixture
def employee_user(db):
    return User.objects.create_user(
        email="employee_settings@example.com",
        password="StrongPass1!",
        role="EMPLOYEE",
    )


@pytest.fixture
def org(db):
    return Organization.objects.create(
        name="Talent Org",
        accent_color="#4F46E5",
        settings_general={"name": "Talent Org", "accent_color": "#4F46E5"},
        settings_performance={"goal_score_cap": "1.0"},
        settings_career={"target_role_scope": "PATH"},
        settings_privacy={"confidential_feedback_visibility": "HR_NONE"},
    )


@pytest.mark.django_db
def test_organization_detail_accessible_to_any_authenticated_user(client, employee_user, org):
    client.force_authenticate(user=employee_user)
    response = client.get("/api/v1/organization/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Talent Org"
    assert data["accent_color"] == "#4F46E5"


@pytest.mark.django_db
def test_organization_settings_forbidden_for_employee(client, employee_user, org):
    client.force_authenticate(user=employee_user)
    response = client.get("/api/v1/organization/settings/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_organization_settings_get_for_hr(client, hr_user, org):
    client.force_authenticate(user=hr_user)
    response = client.get("/api/v1/organization/settings/")
    assert response.status_code == 200
    data = response.json()
    assert "general" in data
    assert "performance" in data
    assert "career" in data
    assert "privacy" in data


@pytest.mark.django_db
def test_patch_performance_settings_consecutive_scale_validation(client, hr_user, org):
    client.force_authenticate(user=hr_user)

    # Invalid rating scale: values [1, 2, 4] not consecutive
    bad_payload = {
        "rating_scale": [
            {"value": 1, "label": "Low", "anchor": "Low anchor"},
            {"value": 2, "label": "Mid", "anchor": "Mid anchor"},
            {"value": 4, "label": "High", "anchor": "High anchor"},
        ]
    }
    res_bad = client.patch("/api/v1/organization/settings/performance/", bad_payload, format="json")
    assert res_bad.status_code == 400

    # Valid rating scale: [1, 2, 3]
    good_payload = {
        "rating_scale": [
            {"value": 1, "label": "Low", "anchor": "Low anchor"},
            {"value": 2, "label": "Mid", "anchor": "Mid anchor"},
            {"value": 3, "label": "High", "anchor": "High anchor"},
        ],
        "goal_score_cap": "1.2",
    }
    res_good = client.patch(
        "/api/v1/organization/settings/performance/", good_payload, format="json"
    )
    assert res_good.status_code == 200
    data = res_good.json()
    assert len(data["values"]["rating_scale"]) == 3
    assert Decimal(str(data["values"]["goal_score_cap"])) == Decimal("1.2")

    # Verify audit log was created
    audit_entry = AuditLog.objects.filter(action=AuditAction.ORG_SETTINGS_CHANGED).first()
    assert audit_entry is not None
    assert audit_entry.actor == hr_user


@pytest.mark.django_db
def test_patch_general_settings_accent_color_validation(client, hr_user, org):
    client.force_authenticate(user=hr_user)

    # Invalid hex
    res_bad = client.patch(
        "/api/v1/organization/settings/general/", {"accent_color": "not-a-color"}
    )
    assert res_bad.status_code == 400

    # Valid hex
    res_good = client.patch(
        "/api/v1/organization/settings/general/",
        {"name": "New Org Name", "accent_color": "#10B981"},
    )
    assert res_good.status_code == 200
    org.refresh_from_db()
    assert org.name == "New Org Name"
    assert org.accent_color == "#10B981"
