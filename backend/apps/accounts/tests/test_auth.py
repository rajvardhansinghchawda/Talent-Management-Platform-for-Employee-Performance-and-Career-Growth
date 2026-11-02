"""Authentication, session, and user management endpoint tests."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.organizations.models import Organization


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="employee@example.com",
        password="StrongPass1!",
        role="EMPLOYEE",
    )


@pytest.fixture
def hr_user(db):
    return User.objects.create_user(
        email="hr@example.com",
        password="StrongPass1!",
        role="HR_ADMIN",
    )


@pytest.fixture
def org(db):
    return Organization.objects.create(
        name="Test Corp",
        accent_color="#4F46E5",
        settings_general={"name": "Test Corp", "accent_color": "#4F46E5"},
        settings_performance={"goal_score_cap": "1.0"},
    )


@pytest.mark.django_db
def test_login_success(client, user):
    response = client.post(
        "/api/v1/auth/login/",
        {"email": "employee@example.com", "password": "StrongPass1!"},
        format="json",
    )
    assert response.status_code == 200
    data = response.json()
    assert "access" in data
    assert data["user"]["email"] == "employee@example.com"
    assert data["user"]["role"] == "EMPLOYEE"
    assert "refresh_token" in response.cookies


@pytest.mark.django_db
def test_login_wrong_password(client, user):
    response = client.post(
        "/api/v1/auth/login/",
        {"email": "employee@example.com", "password": "WrongPassword!"},
        format="json",
    )
    assert response.status_code == 400
    data = response.json()
    assert "error" in data


@pytest.mark.django_db
def test_token_refresh_via_cookie(client, user):
    login_res = client.post(
        "/api/v1/auth/login/",
        {"email": "employee@example.com", "password": "StrongPass1!"},
        format="json",
    )
    assert login_res.status_code == 200
    refresh_token = login_res.cookies["refresh_token"].value

    client.cookies["refresh_token"] = refresh_token
    refresh_res = client.post("/api/v1/auth/refresh/")
    assert refresh_res.status_code == 200
    assert "access" in refresh_res.json()
    assert "refresh_token" in refresh_res.cookies


@pytest.mark.django_db
def test_logout_blacklists_token_and_clears_cookie(client, user):
    login_res = client.post(
        "/api/v1/auth/login/",
        {"email": "employee@example.com", "password": "StrongPass1!"},
        format="json",
    )
    access_token = login_res.json()["access"]
    refresh_token = login_res.cookies["refresh_token"].value

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    client.cookies["refresh_token"] = refresh_token

    logout_res = client.post("/api/v1/auth/logout/")
    assert logout_res.status_code == 200

    # Refresh with blacklisted token should now fail
    client.cookies["refresh_token"] = refresh_token
    failed_refresh = client.post("/api/v1/auth/refresh/")
    assert failed_refresh.status_code == 401


@pytest.mark.django_db
def test_me_endpoint_returns_organization_and_rating_scale(client, user, org):
    client.force_authenticate(user=user)
    response = client.get("/api/v1/auth/me/")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "employee@example.com"
    assert data["role"] == "EMPLOYEE"
    assert data["organization"]["name"] == "Test Corp"
    assert "rating_scale" in data
    assert "available_portals" in data


@pytest.mark.django_db
def test_must_change_password_middleware_blocks_other_endpoints(client, db):
    user_with_flag = User.objects.create_user(
        email="mustchange@example.com",
        password="TempPassword1!",
        role="EMPLOYEE",
        must_change_password=True,
    )
    client.force_authenticate(user=user_with_flag)

    # Allowed endpoints
    assert client.get("/api/v1/auth/me/").status_code == 200
    assert client.post("/api/v1/auth/logout/").status_code == 200

    # Blocked endpoint
    blocked_res = client.get("/api/v1/users/")
    assert blocked_res.status_code == 403
    assert blocked_res.json()["error"]["details"]["code"] == "password_change_required"


@pytest.mark.django_db
def test_password_change_clears_must_change_flag(client, db):
    user_flagged = User.objects.create_user(
        email="changeflag@example.com",
        password="OldPassword1!",
        role="EMPLOYEE",
        must_change_password=True,
    )
    client.force_authenticate(user=user_flagged)

    change_res = client.post(
        "/api/v1/auth/password/change/",
        {"current_password": "OldPassword1!", "new_password": "NewStrongPass1!"},
    )
    assert change_res.status_code == 200

    user_flagged.refresh_from_db()
    assert user_flagged.must_change_password is False
    assert user_flagged.check_password("NewStrongPass1!")


@pytest.mark.django_db
def test_last_hr_admin_cannot_be_demoted_or_deactivated(client, hr_user):
    client.force_authenticate(user=hr_user)

    # Attempt to demote the only HR_ADMIN
    demote_res = client.patch(f"/api/v1/users/{hr_user.id}/", {"role": "EMPLOYEE"})
    assert demote_res.status_code == 409
    assert demote_res.json()["error"]["details"]["reason"] == "LAST_HR_ADMIN"

    # Attempt to deactivate the only HR_ADMIN
    deactivate_res = client.patch(f"/api/v1/users/{hr_user.id}/", {"is_active": False})
    assert deactivate_res.status_code == 409
    assert deactivate_res.json()["error"]["details"]["reason"] == "LAST_HR_ADMIN"
