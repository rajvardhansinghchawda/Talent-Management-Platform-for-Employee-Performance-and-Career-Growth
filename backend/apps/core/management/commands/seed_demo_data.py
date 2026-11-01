"""Management command to seed initial demo data."""

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User
from apps.employees.models import Employee, EmploymentStatus
from apps.organizations.models import Department, Organization
from apps.skills.models import JobRole


class Command(BaseCommand):
    help = "Seeds initial demo data (Organization, Departments, Users, Employees)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing data before seeding",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write("Resetting existing records...")
            Employee.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            Department.objects.all().delete()
            JobRole.objects.all().delete()
            Organization.objects.all().delete()

        # 1. Organization
        org, _ = Organization.objects.get_or_create(
            name="Acme Corporation",
            defaults={
                "accent_color": "#4F46E5",
                "settings_general": {"name": "Acme Corporation", "accent_color": "#4F46E5"},
                "settings_performance": {
                    "rating_scale": [
                        {"value": 1, "label": "Needs Improvement", "anchor": "Below expectations"},
                        {"value": 2, "label": "Developing", "anchor": "Approaching expectations"},
                        {
                            "value": 3,
                            "label": "Meets Expectations",
                            "anchor": "Consistently meets expectations",
                        },
                        {
                            "value": 4,
                            "label": "Exceeds Expectations",
                            "anchor": "Frequently exceeds expectations",
                        },
                        {"value": 5, "label": "Outstanding", "anchor": "Role model performance"},
                    ],
                    "goal_score_cap": "1.0",
                    "goal_approval_required": True,
                },
                "settings_career": {
                    "readiness_thresholds": {
                        "ready_coverage": "0.80",
                        "near_coverage": "0.60",
                        "min_goal_score": "0.70",
                        "min_rating": 3,
                    },
                    "show_self_assessed_as_provisional": True,
                    "target_role_scope": "PATH",
                },
                "settings_privacy": {
                    "confidential_feedback_visibility": "HR_NONE",
                    "ai_enabled": False,
                    "retention_notes": "",
                },
            },
        )
        self.stdout.write(f"Organization: {org.name}")

        # 2. Departments
        depts_data = ["Engineering", "Product", "Design", "Marketing", "Sales"]
        departments = {}
        for idx, name in enumerate(depts_data, start=1):
            d, _ = Department.objects.get_or_create(name=name, defaults={"sort_order": idx * 10})
            departments[name] = d

        # Sub-department for tree testing
        sub_dept, _ = Department.objects.get_or_create(
            name="Platform Team",
            defaults={"parent": departments["Engineering"], "sort_order": 15},
        )

        # 3. Job Roles
        roles_data = [
            ("Junior Python Developer", "Engineering", "L1"),
            ("Senior Backend Developer", "Engineering", "L3"),
            ("Tech Lead", "Engineering", "L4"),
            ("Product Manager", "Product", "L3"),
            ("Product Designer", "Design", "L2"),
        ]
        roles = {}
        for title, dept_name, lvl in roles_data:
            r, _ = JobRole.objects.get_or_create(
                title=title,
                defaults={
                    "department": departments[dept_name],
                    "level": lvl,
                    "is_critical": (title == "Tech Lead"),
                },
            )
            roles[title] = r

        # 4. Users and Employees
        demo_password = "Password123!"

        # HR Admin
        hr_user, _ = User.objects.get_or_create(
            email="hr@acme.com",
            defaults={"role": "HR_ADMIN", "is_staff": True},
        )
        hr_user.set_password(demo_password)
        hr_user.save()

        hr_emp, _ = Employee.objects.get_or_create(
            user=hr_user,
            defaults={
                "employee_code": "EMP001",
                "first_name": "Priya",
                "last_name": "Nair",
                "department": departments["Engineering"],
                "joining_date": timezone.now().date(),
                "employment_status": EmploymentStatus.ACTIVE,
            },
        )

        # Executive
        exec_user, _ = User.objects.get_or_create(
            email="exec@acme.com",
            defaults={"role": "EXECUTIVE"},
        )
        exec_user.set_password(demo_password)
        exec_user.save()

        # Manager
        mgr_user, _ = User.objects.get_or_create(
            email="manager@acme.com",
            defaults={"role": "MANAGER"},
        )
        mgr_user.set_password(demo_password)
        mgr_user.save()

        mgr_emp, _ = Employee.objects.get_or_create(
            user=mgr_user,
            defaults={
                "employee_code": "EMP002",
                "first_name": "Vikram",
                "last_name": "Malhotra",
                "department": departments["Engineering"],
                "job_role": roles["Tech Lead"],
                "joining_date": timezone.now().date(),
                "employment_status": EmploymentStatus.ACTIVE,
            },
        )
        departments["Engineering"].head = mgr_emp
        departments["Engineering"].save(update_fields=["head"])

        # Employee (Rahul Sharma)
        emp_user, _ = User.objects.get_or_create(
            email="rahul@acme.com",
            defaults={"role": "EMPLOYEE"},
        )
        emp_user.set_password(demo_password)
        emp_user.save()

        rahul_emp, _ = Employee.objects.get_or_create(
            user=emp_user,
            defaults={
                "employee_code": "EMP003",
                "first_name": "Rahul",
                "last_name": "Sharma",
                "preferred_name": "Rahul",
                "department": departments["Engineering"],
                "job_role": roles["Junior Python Developer"],
                "target_role": roles["Senior Backend Developer"],
                "manager": mgr_emp,
                "joining_date": timezone.now().date(),
                "employment_status": EmploymentStatus.ACTIVE,
                "location": "Bengaluru",
            },
        )

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully!"))
        self.stdout.write("Credentials:")
        self.stdout.write(f"  HR Admin:  hr@acme.com / {demo_password}")
        self.stdout.write(f"  Executive: exec@acme.com / {demo_password}")
        self.stdout.write(f"  Manager:   manager@acme.com / {demo_password}")
        self.stdout.write(f"  Employee:  rahul@acme.com / {demo_password}")
