from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.employees.models import Employee
from apps.notifications.models import Notification
from apps.organizations.models import Department, Organization
from apps.performance.models import (
    Goal,
    GoalComment,
    GoalDirection,
    GoalStatus,
    GoalType,
    ReviewCycle,
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def org(db):
    return Organization.objects.create(
        name="Acme Corp",
        settings_performance={"goal_score_cap": "1.20"},
    )


@pytest.fixture
def department(db, org):
    return Department.objects.create(name="Engineering")


@pytest.fixture
def hr_user(db):
    user = User.objects.create_user(
        email="hr@acme.com",
        password="Password123!",
        role=UserRole.HR_ADMIN,
        first_name="Helen",
        last_name="HR",
    )
    Employee.objects.create(
        user=user,
        employee_code="HR001",
    )
    return user


@pytest.fixture
def manager_user(db, department):
    user = User.objects.create_user(
        email="manager@acme.com",
        password="Password123!",
        role=UserRole.MANAGER,
        first_name="Marcus",
        last_name="Manager",
    )
    Employee.objects.create(
        user=user,
        employee_code="MGR001",
        department=department,
    )
    return user


@pytest.fixture
def employee_user(db, department, manager_user):
    user = User.objects.create_user(
        email="employee@acme.com",
        password="Password123!",
        role=UserRole.EMPLOYEE,
        first_name="Rahul",
        last_name="Sharma",
    )
    Employee.objects.create(
        user=user,
        employee_code="EMP001",
        department=department,
        manager=manager_user.employee,
    )
    return user


@pytest.fixture
def other_employee_user(db, department):
    user = User.objects.create_user(
        email="other@acme.com",
        password="Password123!",
        role=UserRole.EMPLOYEE,
        first_name="Alice",
        last_name="Smith",
    )
    Employee.objects.create(
        user=user,
        employee_code="EMP002",
        department=department,
    )
    return user


@pytest.fixture
def review_cycle(db):
    today = timezone.now().date()
    return ReviewCycle.objects.create(
        name="2026 Annual Cycle",
        start_date=today,
        end_date=today + timezone.timedelta(days=90),
        status="ACTIVE",
    )


@pytest.mark.django_db
class TestGoalManagement:
    def test_employee_creates_draft_goal(self, api_client, employee_user, review_cycle):
        api_client.force_authenticate(user=employee_user)
        payload = {
            "title": "Ship API v1",
            "description": "Complete all REST endpoints",
            "goal_type": GoalType.KPI,
            "metric_unit": "%",
            "start_value": "0",
            "target_value": "100",
            "direction": GoalDirection.HIGHER_BETTER,
            "weight": "2.0",
            "cycle": str(review_cycle.id),
        }
        response = api_client.post("/api/v1/goals/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.data
        assert data["title"] == "Ship API v1"
        assert data["status"] == GoalStatus.DRAFT
        assert data["owner"]["id"] == str(employee_user.employee.id)
        assert data["is_locked"] is False

    def test_manager_assigns_active_goal_to_subordinate(
        self, api_client, manager_user, employee_user, review_cycle
    ):
        api_client.force_authenticate(user=manager_user)
        payload = {
            "title": "Reduce Latency",
            "employee": str(employee_user.employee.id),
            "target_value": "50",
            "cycle": str(review_cycle.id),
        }
        response = api_client.post("/api/v1/goals/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == GoalStatus.ACTIVE
        assert response.data["owner"]["id"] == str(employee_user.employee.id)

        # Employee receives notification
        notif = Notification.objects.filter(recipient=employee_user).first()
        assert notif is not None
        assert "Reduce Latency" in notif.title

    def test_manager_cannot_assign_goal_outside_reporting_tree(
        self, api_client, manager_user, other_employee_user
    ):
        api_client.force_authenticate(user=manager_user)
        payload = {
            "title": "Unauthorized Goal",
            "employee": str(other_employee_user.employee.id),
        }
        response = api_client.post("/api/v1/goals/", payload, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cycle_prevention(self, api_client, employee_user):
        api_client.force_authenticate(user=employee_user)
        emp = employee_user.employee
        g1 = Goal.objects.create(owner=emp, title="Goal 1", status=GoalStatus.ACTIVE)
        g2 = Goal.objects.create(owner=emp, title="Goal 2", parent=g1, status=GoalStatus.ACTIVE)

        # Setting g1 parent to g2 should fail with 409 CYCLE_DETECTED
        response = api_client.patch(
            f"/api/v1/goals/{g1.id}/", {"parent": str(g2.id)}, format="json"
        )
        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.data["error"]["code"] == "state_conflict"
        assert response.data["error"]["details"]["reason"] == "CYCLE_DETECTED"

    def test_submit_goal_validation_and_lock(self, api_client, employee_user, manager_user):
        api_client.force_authenticate(user=employee_user)
        emp = employee_user.employee

        # Invalid: target == start
        invalid_goal = Goal.objects.create(
            owner=emp,
            title="Invalid",
            start_value=Decimal("10"),
            target_value=Decimal("10"),
            status=GoalStatus.DRAFT,
        )
        res = api_client.post(f"/api/v1/goals/{invalid_goal.id}/submit/")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

        # Valid goal
        valid_goal = Goal.objects.create(
            owner=emp,
            title="Valid Goal",
            start_value=Decimal("0"),
            target_value=Decimal("100"),
            weight=Decimal("1.5"),
            status=GoalStatus.DRAFT,
        )
        res = api_client.post(f"/api/v1/goals/{valid_goal.id}/submit/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == GoalStatus.PENDING_APPROVAL
        assert res.data["is_locked"] is True

        # Manager receives notification
        mgr_notif = Notification.objects.filter(recipient=manager_user).first()
        assert mgr_notif is not None
        assert "Goal Approval Needed" in mgr_notif.title

        # Locked goal cannot be edited
        edit_res = api_client.patch(
            f"/api/v1/goals/{valid_goal.id}/", {"title": "Updated Title"}, format="json"
        )
        assert edit_res.status_code == status.HTTP_409_CONFLICT
        assert edit_res.data["error"]["details"]["reason"] == "GOAL_LOCKED"

    def test_approval_and_rejection_workflow(self, api_client, employee_user, manager_user):
        emp = employee_user.employee
        goal = Goal.objects.create(
            owner=emp,
            title="Refactor Auth",
            start_value=Decimal("0"),
            target_value=Decimal("100"),
            status=GoalStatus.PENDING_APPROVAL,
        )

        # Employee cannot self-approve
        api_client.force_authenticate(user=employee_user)
        res = api_client.post(f"/api/v1/goals/{goal.id}/approve/")
        assert res.status_code == status.HTTP_403_FORBIDDEN

        # Manager rejects without comment -> 400
        api_client.force_authenticate(user=manager_user)
        res = api_client.post(f"/api/v1/goals/{goal.id}/reject/", {"comment": ""}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

        # Manager rejects with comment -> returns to DRAFT
        res = api_client.post(
            f"/api/v1/goals/{goal.id}/reject/",
            {"comment": "Please break this down into smaller tasks."},
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == GoalStatus.DRAFT

        # Re-submit and approve
        api_client.force_authenticate(user=employee_user)
        api_client.post(f"/api/v1/goals/{goal.id}/submit/")

        api_client.force_authenticate(user=manager_user)
        res = api_client.post(
            f"/api/v1/goals/{goal.id}/approve/",
            {"comment": "Looks good, approved!"},
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == GoalStatus.ACTIVE

        # Check comment was saved
        comment = GoalComment.objects.filter(goal=goal, kind=GoalComment.Kind.APPROVAL).first()
        assert comment is not None
        assert "Looks good" in comment.text

    def test_progress_update_and_completion_rules(self, api_client, employee_user):
        api_client.force_authenticate(user=employee_user)
        emp = employee_user.employee
        goal = Goal.objects.create(
            owner=emp,
            title="Read 10 Books",
            start_value=Decimal("0"),
            target_value=Decimal("10"),
            current_value=Decimal("0"),
            status=GoalStatus.ACTIVE,
        )

        # Update progress to 8
        res = api_client.post(
            f"/api/v1/goals/{goal.id}/updates/",
            {"value": "8", "note": "Finished book 8"},
            format="json",
        )
        assert res.status_code == status.HTTP_201_CREATED
        goal.refresh_from_db()
        assert goal.current_value == Decimal("8")
        assert goal.status == GoalStatus.ACTIVE  # Does NOT auto-complete

        # Attempt to complete with target unmet (8 < 10) without note -> 400
        res = api_client.post(f"/api/v1/goals/{goal.id}/complete/", {"note": ""}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

        # Complete with note -> 200
        res = api_client.post(
            f"/api/v1/goals/{goal.id}/complete/",
            {"note": "Quarter ended early, 8/10 accomplished"},
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == GoalStatus.COMPLETED
        assert res.data["completion_note"] == "Quarter ended early, 8/10 accomplished"

    def test_score_calculation_endpoint_with_cap(
        self, api_client, employee_user, review_cycle, org
    ):
        api_client.force_authenticate(user=employee_user)
        emp = employee_user.employee

        # G1: weight 2.0, 8/10 -> score 0.8
        Goal.objects.create(
            owner=emp,
            cycle=review_cycle,
            title="G1",
            start_value=Decimal("0"),
            target_value=Decimal("10"),
            current_value=Decimal("8"),
            weight=Decimal("2.0"),
            status=GoalStatus.ACTIVE,
        )
        # G2: weight 1.0, 15/10 (overshoot) -> score capped at org cap 1.20
        Goal.objects.create(
            owner=emp,
            cycle=review_cycle,
            title="G2",
            start_value=Decimal("0"),
            target_value=Decimal("10"),
            current_value=Decimal("15"),
            weight=Decimal("1.0"),
            status=GoalStatus.ACTIVE,
        )
        # G3: weight 1.0, DRAFT -> should be excluded from calculation
        Goal.objects.create(
            owner=emp,
            cycle=review_cycle,
            title="G3",
            start_value=Decimal("0"),
            target_value=Decimal("10"),
            current_value=Decimal("0"),
            weight=Decimal("1.0"),
            status=GoalStatus.DRAFT,
        )

        res = api_client.get(f"/api/v1/goals/score/?employee=me&cycle={review_cycle.id}")
        assert res.status_code == status.HTTP_200_OK
        data = res.data

        # Total weight of eligible = 2.0 + 1.0 = 3.0
        # G1 contrib: 2.0 * 0.8 = 1.6
        # G2 contrib: 1.0 * 1.2 = 1.2
        # weighted = (1.6 + 1.2) / 3.0 = 2.8 / 3.0 = 0.9333
        assert Decimal(str(data["total_weight"])) == Decimal("3.0")
        assert Decimal(str(data["cap"])) == Decimal("1.20")
        assert Decimal(str(data["weighted_score"])) == Decimal("0.9333")
        assert len(data["goals"]) == 3  # All goals listed with individual contributions

    def test_manager_team_scoping_and_approval_queue(
        self, api_client, manager_user, employee_user, other_employee_user
    ):
        emp = employee_user.employee
        other_emp = other_employee_user.employee

        # Create pending goals
        g_team = Goal.objects.create(
            owner=emp,
            title="Team Goal",
            status=GoalStatus.PENDING_APPROVAL,
        )
        g_other = Goal.objects.create(
            owner=other_emp,
            title="Other Goal",
            status=GoalStatus.PENDING_APPROVAL,
        )

        api_client.force_authenticate(user=manager_user)

        # Team queue sees only own direct report's goal
        res = api_client.get("/api/v1/goals/?scope=team&status=PENDING_APPROVAL")
        assert res.status_code == status.HTTP_200_OK
        items = res.data["results"] if "results" in res.data else res.data
        goal_ids = [item["id"] for item in items]
        assert str(g_team.id) in goal_ids
        assert str(g_other.id) not in goal_ids

        # Attempt to access other employee's goal detail -> 404
        detail_res = api_client.get(f"/api/v1/goals/{g_other.id}/")
        assert detail_res.status_code == status.HTTP_404_NOT_FOUND
