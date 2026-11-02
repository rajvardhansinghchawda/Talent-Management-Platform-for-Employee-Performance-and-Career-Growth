from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.employees.models import Employee, EmploymentStatus
from apps.notifications.models import Notification
from apps.organizations.models import Department, Organization
from apps.performance.models import (
    CycleStatus,
    Goal,
    GoalStatus,
    PerformanceReview,
    ReviewCycle,
    ReviewStatus,
)
from apps.performance.services import (
    transition_review,
)
from apps.performance.tasks import send_review_overdue_reminders


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def org(db):
    return Organization.objects.create(
        name="Acme Corp",
        settings_performance={
            "rating_scale": [
                {"value": 1, "label": "Needs Improvement", "anchor": "Unsatisfactory"},
                {"value": 2, "label": "Developing", "anchor": "Partially meets"},
                {"value": 3, "label": "Meets Expectations", "anchor": "Solid performer"},
                {"value": 4, "label": "Exceeds Expectations", "anchor": "High performer"},
                {"value": 5, "label": "Outstanding", "anchor": "Role model"},
            ],
            "goal_score_cap": "1.00",
        },
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
    )
    Employee.objects.create(
        user=user,
        employee_code="HR001",
        first_name="Helen",
        last_name="HR",
    )
    return user


@pytest.fixture
def manager_user(db, department):
    user = User.objects.create_user(
        email="manager@acme.com",
        password="Password123!",
        role=UserRole.MANAGER,
    )
    Employee.objects.create(
        user=user,
        employee_code="MGR001",
        department=department,
        first_name="Marcus",
        last_name="Manager",
    )
    return user


@pytest.fixture
def employee_user(db, department, manager_user):
    user = User.objects.create_user(
        email="employee@acme.com",
        password="Password123!",
        role=UserRole.EMPLOYEE,
    )
    Employee.objects.create(
        user=user,
        employee_code="EMP001",
        department=department,
        manager=manager_user.employee,
        first_name="Rahul",
        last_name="Sharma",
        employment_status=EmploymentStatus.ACTIVE,
    )
    return user


@pytest.mark.django_db
class TestReviewWorkflow:
    def test_full_happy_path_workflow(
        self, api_client, hr_user, manager_user, employee_user, department, org
    ):
        emp = employee_user.employee
        mgr = manager_user.employee

        # 1. Active goal with score 0.8
        Goal.objects.create(
            owner=emp,
            title="Key Deliverable",
            start_value=Decimal("0"),
            target_value=Decimal("10"),
            current_value=Decimal("8"),
            weight=Decimal("1.0"),
            status=GoalStatus.ACTIVE,
        )

        # 2. HR creates and activates cycle
        api_client.force_authenticate(user=hr_user)
        today = timezone.now().date()
        cycle_payload = {
            "name": "2026 Annual Review",
            "cycle_type": "ANNUAL",
            "start_date": str(today),
            "end_date": str(today + timezone.timedelta(days=60)),
            "self_assessment_due": str(today + timezone.timedelta(days=15)),
            "manager_review_due": str(today + timezone.timedelta(days=30)),
            "departments": [str(department.id)],
        }
        create_res = api_client.post("/api/v1/review-cycles/", cycle_payload, format="json")
        assert create_res.status_code == status.HTTP_201_CREATED
        cycle_id = create_res.data["id"]

        activate_res = api_client.post(f"/api/v1/review-cycles/{cycle_id}/activate/")
        assert activate_res.status_code == status.HTTP_200_OK
        assert activate_res.data["status"] == CycleStatus.ACTIVE

        # Review should be automatically created in SELF_ASSESSMENT status
        review = PerformanceReview.objects.filter(employee=emp, cycle_id=cycle_id).first()
        assert review is not None
        assert review.status == ReviewStatus.SELF_ASSESSMENT
        assert review.reviewer == mgr

        # 3. Employee saves draft
        api_client.force_authenticate(user=employee_user)
        draft_payload = {"draft": {"achievements": "Built scalable backend services"}}
        draft_res = api_client.put(
            f"/api/v1/reviews/{review.id}/self-assessment/draft/",
            draft_payload,
            format="json",
        )
        assert draft_res.status_code == status.HTTP_200_OK

        # 4. Employee submits self-assessment
        submit_payload = {
            "self_rating": 4,
            "self_comments": "Solid performance across all goals.",
            "competencies": [
                {"name": "Technical Execution", "rating": 4, "comment": "High code quality"}
            ],
        }
        submit_res = api_client.post(
            f"/api/v1/reviews/{review.id}/self-assessment/",
            submit_payload,
            format="json",
        )
        assert submit_res.status_code == status.HTTP_200_OK
        assert submit_res.data["status"] == ReviewStatus.MANAGER_REVIEW

        # Manager receives notification
        mgr_notif = Notification.objects.filter(recipient=manager_user).first()
        assert mgr_notif is not None
        assert "Manager Review Due" in mgr_notif.title

        # Employee cannot resubmit or edit
        resubmit_res = api_client.post(
            f"/api/v1/reviews/{review.id}/self-assessment/",
            submit_payload,
            format="json",
        )
        assert resubmit_res.status_code == status.HTTP_409_CONFLICT
        assert resubmit_res.data["error"]["details"]["reason"] == "INVALID_TRANSITION"

        # 5. Manager submits manager review
        api_client.force_authenticate(user=manager_user)
        mgr_submit_payload = {
            "manager_rating": 4,
            "manager_comments": "Great contributions to the platform architecture.",
            "competencies": [{"name": "Technical Execution", "rating": 4}],
            "development_recommendations": ["Lead system design reviews next quarter"],
        }
        mgr_res = api_client.post(
            f"/api/v1/reviews/{review.id}/manager-review/",
            mgr_submit_payload,
            format="json",
        )
        assert mgr_res.status_code == status.HTTP_200_OK
        assert mgr_res.data["status"] == ReviewStatus.CALIBRATION

        # Goal score was snapshotted
        review.refresh_from_db()
        assert review.goal_score_snapshot == Decimal("0.8000")

        # 6. Confidentiality check: Employee viewing review in CALIBRATION cannot see manager rating
        api_client.force_authenticate(user=employee_user)
        emp_view = api_client.get(f"/api/v1/reviews/{review.id}/")
        assert emp_view.status_code == status.HTTP_200_OK
        assert emp_view.data["manager_rating"] is None
        assert emp_view.data["manager_comments"] is None
        assert emp_view.data["development_recommendations"] is None

        # 7. HR Calibration & Finalization
        api_client.force_authenticate(user=hr_user)
        prop_res = api_client.post(
            f"/api/v1/reviews/{review.id}/propose-calibration/",
            {"calibrated_rating": 4, "comment": "Aligned with department distribution"},
            format="json",
        )
        assert prop_res.status_code == status.HTTP_200_OK

        fin_res = api_client.post(
            f"/api/v1/reviews/{review.id}/finalize/",
            {"final_rating": 4, "comment": "Finalized by HR committee"},
            format="json",
        )
        assert fin_res.status_code == status.HTTP_200_OK
        assert fin_res.data["status"] == ReviewStatus.COMPLETED

        # 8. Post-completion visibility: Employee can now view manager ratings and final rating
        api_client.force_authenticate(user=employee_user)
        completed_view = api_client.get(f"/api/v1/reviews/{review.id}/")
        assert completed_view.data["manager_rating"] == 4
        assert completed_view.data["final_rating"] == 4
        assert completed_view.data["development_recommendations"] == [
            "Lead system design reviews next quarter"
        ]

        # 9. Employee acknowledges
        ack_res = api_client.post(f"/api/v1/reviews/{review.id}/acknowledge/")
        assert ack_res.status_code == status.HTTP_200_OK
        assert ack_res.data["status"] == ReviewStatus.ACKNOWLEDGED

    def test_dispute_and_reopen_flow(self, api_client, hr_user, employee_user, manager_user, org):
        emp = employee_user.employee
        today = timezone.now().date()
        cycle = ReviewCycle.objects.create(
            name="Cycle Dispute Test",
            start_date=today,
            end_date=today + timezone.timedelta(days=30),
            status=CycleStatus.ACTIVE,
        )
        review = PerformanceReview.objects.create(
            employee=emp,
            cycle=cycle,
            reviewer=manager_user.employee,
            status=ReviewStatus.COMPLETED,
            manager_rating=3,
            final_rating=3,
        )

        api_client.force_authenticate(user=employee_user)

        # Dispute without reason -> 400
        fail_dispute = api_client.post(
            f"/api/v1/reviews/{review.id}/dispute/", {"reason": ""}, format="json"
        )
        assert fail_dispute.status_code == status.HTTP_400_BAD_REQUEST

        # Valid dispute
        dispute_res = api_client.post(
            f"/api/v1/reviews/{review.id}/dispute/",
            {"reason": "Goal overshoot in Q2 was not factored in."},
            format="json",
        )
        assert dispute_res.status_code == status.HTTP_200_OK
        assert dispute_res.data["status"] == ReviewStatus.DISPUTED

        # HR Reopens review
        api_client.force_authenticate(user=hr_user)
        reopen_res = api_client.post(
            f"/api/v1/reviews/{review.id}/reopen/",
            {"comment": "Reopening for committee review with additional evidence."},
            format="json",
        )
        assert reopen_res.status_code == status.HTTP_200_OK
        assert reopen_res.data["status"] == ReviewStatus.CALIBRATION

    @pytest.mark.parametrize(
        "current_status,invalid_target",
        [
            (ReviewStatus.NOT_STARTED, ReviewStatus.MANAGER_REVIEW),
            (ReviewStatus.NOT_STARTED, ReviewStatus.COMPLETED),
            (ReviewStatus.SELF_ASSESSMENT, ReviewStatus.CALIBRATION),
            (ReviewStatus.SELF_ASSESSMENT, ReviewStatus.COMPLETED),
            (ReviewStatus.MANAGER_REVIEW, ReviewStatus.COMPLETED),
            (ReviewStatus.MANAGER_REVIEW, ReviewStatus.ACKNOWLEDGED),
            (ReviewStatus.CALIBRATION, ReviewStatus.ACKNOWLEDGED),
            (ReviewStatus.CALIBRATION, ReviewStatus.DISPUTED),
            (ReviewStatus.COMPLETED, ReviewStatus.MANAGER_REVIEW),
            (ReviewStatus.ACKNOWLEDGED, ReviewStatus.SELF_ASSESSMENT),
            (ReviewStatus.ACKNOWLEDGED, ReviewStatus.CALIBRATION),
            (ReviewStatus.DISPUTED, ReviewStatus.COMPLETED),
        ],
    )
    def test_state_machine_blocks_invalid_transitions(
        self, current_status, invalid_target, employee_user, hr_user
    ):
        today = timezone.now().date()
        cycle = ReviewCycle.objects.create(
            name="Matrix Test",
            start_date=today,
            end_date=today + timezone.timedelta(days=30),
            status=CycleStatus.ACTIVE,
        )
        review = PerformanceReview.objects.create(
            employee=employee_user.employee,
            cycle=cycle,
            status=current_status,
        )

        with pytest.raises(Exception) as excinfo:
            transition_review(review, invalid_target, actor=hr_user)
        assert "Invalid review transition" in str(excinfo.value)

    def test_overdue_reminders_task(self, employee_user, manager_user):
        today = timezone.now().date()
        cycle = ReviewCycle.objects.create(
            name="Overdue Cycle",
            start_date=today - timezone.timedelta(days=30),
            end_date=today + timezone.timedelta(days=10),
            self_assessment_due=today - timezone.timedelta(days=5),  # Passed!
            status=CycleStatus.ACTIVE,
        )
        PerformanceReview.objects.create(
            employee=employee_user.employee,
            cycle=cycle,
            reviewer=manager_user.employee,
            status=ReviewStatus.SELF_ASSESSMENT,
        )

        count = send_review_overdue_reminders()
        assert count >= 1

        notif = Notification.objects.filter(
            recipient=employee_user, title__icontains="Overdue"
        ).first()
        assert notif is not None
