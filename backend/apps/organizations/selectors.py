from .models import Department, Organization


def get_organization() -> Organization | None:
    return Organization.objects.first()


def list_departments():
    return Department.objects.all().select_related("head", "parent")
