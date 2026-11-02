"""Employee hierarchy, profile management, and lifecycle tests."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.employees.models import Employee, EmploymentStatus
from apps.organizations.models import Department
from apps.skills.models import JobRole


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def hr_user(db):
    user = User.objects.create_user(
        email="hr_emp@example.com", password="Pass123!A", role="HR_ADMIN"
    )
    dept = Department.objects.create(name="People Ops")
    Employee.objects.create(
        user=user,
        employee_code="HR001",
        first_name="HR",
        last_name="Manager",
        department=dept,
    )
    return user


@pytest.fixture
def manager_user(db):
    user = User.objects.create_user(email="mgr@example.com", password="Pass123!A", role="MANAGER")
    dept = Department.objects.create(name="Engineering")
    role = JobRole.objects.create(title="Eng Manager")
    emp = Employee.objects.create(
        user=user,
        employee_code="MGR001",
        first_name="Manager",
        last_name="One",
        department=dept,
        job_role=role,
    )
    return user, emp


@pytest.fixture
def report_user(db, manager_user):
    _, mgr_emp = manager_user
    user = User.objects.create_user(email="dev@example.com", password="Pass123!A", role="EMPLOYEE")
    emp = Employee.objects.create(
        user=user,
        employee_code="DEV001",
        first_name="Dev",
        last_name="User",
        manager=mgr_emp,
    )
    return user, emp


@pytest.fixture
def other_employee(db):
    user = User.objects.create_user(
        email="other@example.com", password="Pass123!A", role="EMPLOYEE"
    )
    emp = Employee.objects.create(
        user=user,
        employee_code="OTH001",
        first_name="Other",
        last_name="Worker",
    )
    return user, emp


@pytest.mark.django_db
def test_create_user_and_employee_atomic(client, hr_user):
    client.force_authenticate(user=hr_user)
    payload = {
        "email": "newbie@example.com",
        "role": "EMPLOYEE",
        "credential_mode": "TEMP_PASSWORD",
        "employee_code": "NEW001",
        "first_name": "New",
        "last_name": "Hire",
        "location": "Remote",
    }
    response = client.post("/api/v1/users/", payload)
    assert response.status_code == 201
    data = response.json()
    assert "user" in data
    assert "employee" in data
    assert "temporary_password" in data
    assert data["employee"]["employee_code"] == "NEW001"
    assert User.objects.filter(email="newbie@example.com").exists()
    assert Employee.objects.filter(employee_code="NEW001").exists()


@pytest.mark.django_db
def test_directory_view_hides_sensitive_fields(client, report_user):
    user, _ = report_user
    client.force_authenticate(user=user)

    response = client.get("/api/v1/employees/?scope=directory")
    assert response.status_code == 200
    results = response.json()
    assert len(results) > 0

    first_item = results[0]
    # Directory should have name, designation, department, manager
    assert "name" in first_item
    assert "photo_url" in first_item
    # Must NOT expose private fields
    assert "phone" not in first_item
    assert "bio" not in first_item
    assert "salary" not in first_item


@pytest.mark.django_db
def test_employee_me_patch_strict_whitelist(client, report_user):
    user, emp = report_user
    client.force_authenticate(user=user)

    # Valid patch
    valid_res = client.patch(
        "/api/v1/employees/me/",
        {"preferred_name": "Devvy", "phone": "555-1234", "bio": "Hello world!"},
    )
    assert valid_res.status_code == 200
    emp.refresh_from_db()
    assert emp.preferred_name == "Devvy"
    assert emp.phone == "555-1234"

    # Invalid patch attempting to change unauthorized fields
    invalid_res = client.patch("/api/v1/employees/me/", {"employee_code": "HACKED"})
    assert invalid_res.status_code == 400


@pytest.mark.django_db
def test_manager_access_scoped_to_reporting_tree(client, manager_user, report_user, other_employee):
    mgr_user, _ = manager_user
    _, dev_emp = report_user
    _, other_emp = other_employee

    client.force_authenticate(user=mgr_user)

    # Allowed: dev_emp reports to mgr_user
    allowed_res = client.get(f"/api/v1/employees/{dev_emp.id}/")
    assert allowed_res.status_code == 200
    assert allowed_res.json()["id"] == str(dev_emp.id)

    # 404: other_emp does NOT report to mgr_user
    blocked_res = client.get(f"/api/v1/employees/{other_emp.id}/")
    assert blocked_res.status_code == 404


@pytest.mark.django_db
def test_manager_cycle_prevention(client, hr_user, manager_user, report_user):
    _, mgr_emp = manager_user
    _, dev_emp = report_user
    client.force_authenticate(user=hr_user)

    # Cannot set manager to self
    self_res = client.post(
        f"/api/v1/employees/{mgr_emp.id}/change-manager/",
        {"manager": str(mgr_emp.id), "effective_date": "2024-02-01"},
        format="json",
    )
    assert self_res.status_code == 409
    assert self_res.json()["error"]["details"]["reason"] == "CYCLE_DETECTED"

    # Cannot set mgr's manager to dev_emp (since dev reports to mgr)
    cycle_res = client.post(
        f"/api/v1/employees/{mgr_emp.id}/change-manager/",
        {"manager": str(dev_emp.id), "effective_date": "2024-02-01"},
        format="json",
    )
    assert cycle_res.status_code == 409
    assert cycle_res.json()["error"]["details"]["reason"] == "CYCLE_DETECTED"


@pytest.mark.django_db
def test_deactivate_and_reactivate_employee(client, hr_user, report_user):
    user, emp = report_user
    client.force_authenticate(user=hr_user)

    # Deactivate
    deact_res = client.post(f"/api/v1/employees/{emp.id}/deactivate/", {"reason": "Resigned"})
    assert deact_res.status_code == 200
    emp.refresh_from_db()
    user.refresh_from_db()
    assert emp.is_active is False
    assert emp.employment_status == EmploymentStatus.EXITED
    assert user.is_active is False

    # Reactivate
    react_res = client.post(f"/api/v1/employees/{emp.id}/reactivate/")
    assert react_res.status_code == 200
    emp.refresh_from_db()
    user.refresh_from_db()
    assert emp.is_active is True
    assert emp.employment_status == EmploymentStatus.ACTIVE
    assert user.is_active is True


@pytest.mark.django_db
def test_department_tree_and_cycle_prevention(client, hr_user):
    client.force_authenticate(user=hr_user)

    d1 = Department.objects.create(name="Engineering")
    d2 = Department.objects.create(name="Backend", parent=d1)

    # Tree
    tree_res = client.get("/api/v1/departments/tree/")
    assert tree_res.status_code == 200
    tree = tree_res.json()
    assert any(node["name"] == "Engineering" and len(node["children"]) == 1 for node in tree)

    # Attempt to set d1's parent to d2 (creates cycle)
    cycle_res = client.patch(f"/api/v1/departments/{d1.id}/", {"parent": str(d2.id)}, format="json")
    assert cycle_res.status_code == 409
    assert cycle_res.json()["error"]["details"]["reason"] == "CYCLE_DETECTED"


@pytest.mark.django_db
def test_department_deletion_blocked_if_has_employees(client, hr_user, report_user):
    _, emp = report_user
    client.force_authenticate(user=hr_user)

    dept = Department.objects.create(name="Data Science")
    emp.department = dept
    emp.save()

    del_res = client.delete(f"/api/v1/departments/{dept.id}/")
    assert del_res.status_code == 409
    assert del_res.json()["error"]["details"]["reason"] == "HAS_EMPLOYEES"


@pytest.mark.django_db
def test_employee_import_preview_catches_bad_rows(client, hr_user):
    client.force_authenticate(user=hr_user)

    csv_content = (
        "employee_code,email,first_name,last_name,department\n"
        ",bad_code@example.com,John,Doe,Engineering\n"  # missing code
        "IMP001,,Jane,Doe,Design\n"  # missing email
        "IMP002,valid@example.com,Valid,Person,Sales\n"  # valid
    )
    file_obj = SimpleUploadedFile(
        "employees.csv", csv_content.encode("utf-8"), content_type="text/csv"
    )

    response = client.post(
        "/api/v1/employees/import/preview/", {"file": file_obj}, format="multipart"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_rows"] == 3
    assert len(data["errors"]) == 2
    assert data["can_commit"] is False
