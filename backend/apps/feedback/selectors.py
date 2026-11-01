from .models import Feedback


def list_visible_feedback_for_employee(employee_id):
    return Feedback.objects.filter(to_employee_id=employee_id).exclude(
        visibility="PRIVATE_TO_MANAGER"
    )
