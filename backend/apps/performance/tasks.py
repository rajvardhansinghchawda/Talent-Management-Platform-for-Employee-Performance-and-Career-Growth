"""Celery tasks for performance review cycle reminders and notifications."""

import logging

from celery import shared_task
from django.utils import timezone

from apps.notifications.models import NotificationCategory
from apps.notifications.services import notify
from apps.performance.models import (
    PerformanceReview,
    ReviewCycle,
    ReviewStatus,
)

logger = logging.getLogger(__name__)


@shared_task(queue="notifications")
def send_cycle_activation_notifications(cycle_id: str) -> int:
    """Notify all eligible employees and their managers that a new review cycle is active."""
    cycle = ReviewCycle.objects.filter(id=cycle_id).first()
    if not cycle:
        logger.warning("Review cycle %s not found for activation notification.", cycle_id)
        return 0

    reviews = PerformanceReview.objects.filter(cycle=cycle).select_related(
        "employee", "employee__user", "reviewer", "reviewer__user"
    )

    notified_count = 0
    for review in reviews:
        if review.employee.user:
            notify(
                user=review.employee.user,
                category=NotificationCategory.CYCLE_STARTED,
                title=f"Review Cycle Started: {cycle.name}",
                body=f"Self-assessment is now open for {cycle.name}.",
                link=f"/employee/reviews/{review.id}",
            )
            notified_count += 1

        if review.reviewer and review.reviewer.user:
            notify(
                user=review.reviewer.user,
                category=NotificationCategory.CYCLE_STARTED,
                title=f"Review Cycle Started: {cycle.name}",
                body=f"Team reviews for {cycle.name} will begin after self-assessments.",
                link="/manager/reviews",
            )
            notified_count += 1

    logger.info("Sent %d activation notifications for cycle %s", notified_count, cycle.name)
    return notified_count


@shared_task(queue="notifications")
def send_review_due_soon_reminders() -> int:
    """
    Celery Beat task: Remind employees and managers 2 days before review deadlines.
    """
    today = timezone.now().date()
    two_days_later = today + timezone.timedelta(days=2)

    count = 0
    # Remind employees with pending self-assessments
    cycles_self = ReviewCycle.objects.filter(status="ACTIVE", self_assessment_due=two_days_later)
    for cycle in cycles_self:
        pending_self = PerformanceReview.objects.filter(
            cycle=cycle, status=ReviewStatus.SELF_ASSESSMENT
        ).select_related("employee__user")
        for rev in pending_self:
            if rev.employee.user:
                notify(
                    user=rev.employee.user,
                    category=NotificationCategory.REVIEW_DUE,
                    title=f"Self-Assessment Due Soon: {cycle.name}",
                    body="Your self-assessment is due in 2 days.",
                    link=f"/employee/reviews/{rev.id}",
                )
                count += 1

    # Remind managers with pending reviews
    cycles_mgr = ReviewCycle.objects.filter(status="ACTIVE", manager_review_due=two_days_later)
    for cycle in cycles_mgr:
        pending_mgr = PerformanceReview.objects.filter(
            cycle=cycle, status=ReviewStatus.MANAGER_REVIEW
        ).select_related("reviewer__user", "employee")
        for rev in pending_mgr:
            if rev.reviewer and rev.reviewer.user:
                notify(
                    user=rev.reviewer.user,
                    category=NotificationCategory.REVIEW_DUE,
                    title=f"Manager Review Due Soon: {cycle.name}",
                    body=f"Manager review for {rev.employee.name} is due in 2 days.",
                    link=f"/manager/reviews/{rev.id}",
                )
                count += 1

    return count


@shared_task(queue="notifications")
def send_review_overdue_reminders() -> int:
    """
    Celery Beat task: Flag and notify overdue self-assessments and manager reviews.
    """
    today = timezone.now().date()
    count = 0

    # Overdue self-assessments
    overdue_self = PerformanceReview.objects.filter(
        cycle__status="ACTIVE",
        cycle__self_assessment_due__lt=today,
        status=ReviewStatus.SELF_ASSESSMENT,
    ).select_related("employee__user", "cycle")

    for rev in overdue_self:
        if rev.employee.user:
            notify(
                user=rev.employee.user,
                category=NotificationCategory.REVIEW_OVERDUE,
                title=f"Self-Assessment Overdue: {rev.cycle.name}",
                body="Your self-assessment deadline has passed. Please submit immediately.",
                link=f"/employee/reviews/{rev.id}",
            )
            count += 1

    # Overdue manager reviews
    overdue_mgr = PerformanceReview.objects.filter(
        cycle__status="ACTIVE",
        cycle__manager_review_due__lt=today,
        status=ReviewStatus.MANAGER_REVIEW,
    ).select_related("reviewer__user", "employee", "cycle")

    for rev in overdue_mgr:
        if rev.reviewer and rev.reviewer.user:
            notify(
                user=rev.reviewer.user,
                category=NotificationCategory.REVIEW_OVERDUE,
                title=f"Manager Review Overdue: {rev.cycle.name}",
                body=f"Review for {rev.employee.name} is overdue.",
                link=f"/manager/reviews/{rev.id}",
            )
            count += 1

    return count
