from .models import DevelopmentPlan


def get_latest_plan_for_employee(employee_id):
    return DevelopmentPlan.objects.filter(employee_id=employee_id).prefetch_related("items").first()
