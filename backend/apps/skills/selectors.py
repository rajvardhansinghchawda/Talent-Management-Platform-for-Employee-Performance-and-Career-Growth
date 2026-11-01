from .models import JobRole, Skill


def list_active_skills():
    return Skill.objects.filter(is_active=True)


def list_job_roles():
    return JobRole.objects.all().select_related("department")
