"""Authentication endpoint tests."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="test@example.com",
        password="StrongPass1!",
        role="EMPLOYEE",
    )


@pytest.mark.django_db
def test_login_success(client, user):
    response = client.post(
        "/api/v1/auth/login/", {"email": "test@example.com", "password": "StrongPass1!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access" in data
    assert data["user"]["email"] == "test@example.com"
    assert "refresh_token" in response.cookies


@pytest.mark.django_db
def test_login_wrong_password(client, user):
    response = client.post(
        "/api/v1/auth/login/", {"email": "test@example.com", "password": "WrongPassword!"}
    )
    assert response.status_code == 400
    data = response.json()
    assert "error" in data


@pytest.mark.django_db
def test_login_nonexistent_user(client):
    response = client.post(
        "/api/v1/auth/login/", {"email": "nobody@example.com", "password": "Pass1!"}
    )
    assert response.status_code == 400
    data = response.json()
    assert "error" in data


@pytest.mark.django_db
def test_me_requires_auth(client):
    response = client.get("/api/v1/auth/me/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_me_returns_user_data(client, user):
    client.force_authenticate(user=user)
    response = client.get("/api/v1/auth/me/")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["role"] == "EMPLOYEE"
    assert "available_portals" in data


@pytest.mark.django_db
def test_password_policy_returns_rules(client):
    response = client.get("/api/v1/auth/password/policy/")
    assert response.status_code == 200
    data = response.json()
    assert "min_length" in data
    assert "rules" in data


@pytest.mark.django_db
def test_password_reset_request_always_returns_200(client):
    """Password reset must never reveal whether an email exists."""
    response = client.post("/api/v1/auth/password/reset/", {"email": "nonexistent@example.com"})
    assert response.status_code == 200
    response2 = client.post("/api/v1/auth/password/reset/", {"email": "test@example.com"})
    assert response2.status_code == 200
