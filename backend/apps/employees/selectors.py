from .models import Employee


def get_employee_by_id(employee_id) -> Employee | None:
    try:
        return Employee.objects.select_related("user", "department", "job_role", "manager").get(
            id=employee_id
        )
    except Employee.DoesNotExist:
        return None


def get_employee_for_user(user) -> Employee | None:
    try:
        return Employee.objects.select_related("user", "department", "job_role", "manager").get(
            user=user
        )
    except Employee.DoesNotExist:
        return None


def reports_to_tree(manager: Employee, include_self: bool = False) -> list[Employee]:
    """Return all direct and indirect reports in manager's subtree."""
    results = [manager] if include_self else []
    direct = list(Employee.objects.filter(manager=manager, is_active=True))
    results.extend(direct)
    for report in direct:
        results.extend(reports_to_tree(report, include_self=False))
    return results
