from .models import Course


def list_active_courses():
    return Course.objects.filter(is_active=True)
