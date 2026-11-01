"""Test that the custom exception handler returns the standard error format."""

import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_404_returns_standard_error_format():
    """A request to a non-existent URL must return the standard error format."""
    client = APIClient()
    response = client.get("/api/v1/nonexistent-endpoint-xyz/")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]


@pytest.mark.django_db
def test_401_returns_standard_error_format():
    """An unauthenticated request to a protected endpoint returns the standard error format."""
    client = APIClient()
    response = client.get("/api/v1/auth/me/")
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "authentication_failed"


@pytest.mark.django_db
def test_healthz_returns_ok():
    """The /healthz endpoint must return 200 OK."""
    client = APIClient()
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
