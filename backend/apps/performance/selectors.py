from .models import Goal, ReviewCycle


def get_active_review_cycle() -> ReviewCycle | None:
    return ReviewCycle.objects.filter(status="ACTIVE").first()


def list_goals_for_employee(employee_id, cycle_id=None):
    qs = Goal.objects.filter(owner_id=employee_id)
    if cycle_id:
        qs = qs.filter(cycle_id=cycle_id)
    return qs
