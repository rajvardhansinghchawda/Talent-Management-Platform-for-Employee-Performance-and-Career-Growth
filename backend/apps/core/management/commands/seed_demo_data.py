"""Management command to seed initial demo data."""

import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.models import AuditAction, AuditLog
from apps.careers.models import (
    DevelopmentPlan,
    DevelopmentPlanItem,
    DevelopmentPlanItemStatus,
    DevelopmentPlanStatus,
)
from apps.employees.models import Employee, EmploymentStatus
from apps.feedback.models import (
    ActionItem,
    Badge,
    Feedback,
    FeedbackType,
    FeedbackVisibility,
    OneOnOne,
    Recognition,
)
from apps.learning.models import (
    Course,
    CourseDifficulty,
    CourseFormat,
    CourseSkill,
    Enrollment,
    EnrollmentStatus,
)
from apps.organizations.models import Department, Organization
from apps.performance.models import (
    CycleStatus,
    CycleType,
    Goal,
    GoalDirection,
    GoalStatus,
    GoalType,
    PerformanceReview,
    ReviewCycle,
    ReviewStatus,
)
from apps.reports.models import ReportFormat, ReportJob, ReportStatus
from apps.skills.models import (
    CareerPathStep,
    JobRole,
    RoleSkill,
    Skill,
    SkillAssessment,
    SkillAssessmentSource,
    SkillAssessmentStatus,
)


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
            AuditLog.objects.all().delete()
            ReportJob.objects.all().delete()
            ActionItem.objects.all().delete()
            OneOnOne.objects.all().delete()
            Recognition.objects.all().delete()
            Badge.objects.all().delete()
            Feedback.objects.all().delete()
            DevelopmentPlanItem.objects.all().delete()
            DevelopmentPlan.objects.all().delete()
            Enrollment.objects.all().delete()
            CourseSkill.objects.all().delete()
            Course.objects.all().delete()
            PerformanceReview.objects.all().delete()
            Goal.objects.all().delete()
            ReviewCycle.objects.all().delete()
            SkillAssessment.objects.all().delete()
            RoleSkill.objects.all().delete()
            CareerPathStep.objects.all().delete()
            JobRole.objects.all().delete()
            Department.objects.update(head=None, parent=None)
            Employee.objects.update(manager=None, department=None, job_role=None, target_role=None)
            Employee.objects.all().delete()
            Department.objects.all().delete()
            User.objects.all().delete()
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
        hr_user = User.objects.filter(email="hr@acme.com").first()
        if not hr_user:
            hr_user = User.objects.create_user(
                email="hr@acme.com", password=demo_password, role="HR_ADMIN", is_staff=True
            )
        else:
            hr_user.set_password(demo_password)
            hr_user.save()

        hr_emp, _ = Employee.objects.get_or_create(
            user=hr_user,
            defaults={
                "employee_code": "EMP001",
                "first_name": "Sarah",
                "last_name": "Jenkins",
                "department": departments["Engineering"],
                "joining_date": timezone.now().date(),
                "employment_status": EmploymentStatus.ACTIVE,
            },
        )

        # Executive
        exec_user = User.objects.filter(email="exec@acme.com").first()
        if not exec_user:
            exec_user = User.objects.create_user(
                email="exec@acme.com", password=demo_password, role="EXECUTIVE"
            )
        else:
            exec_user.set_password(demo_password)
            exec_user.save()

        # Manager
        mgr_user = User.objects.filter(email="manager@acme.com").first()
        if not mgr_user:
            mgr_user = User.objects.create_user(
                email="manager@acme.com", password=demo_password, role="MANAGER"
            )
        else:
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
        emp_user = User.objects.filter(email="rahul@acme.com").first()
        if not emp_user:
            emp_user = User.objects.create_user(
                email="rahul@acme.com", password=demo_password, role="EMPLOYEE"
            )
        else:
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
        # 5. Goals for Rahul Sharma

        # Skills
        py_skill, _ = Skill.objects.get_or_create(
            name="Python & Django",
            defaults={
                "category": "Backend",
                "description": "Core backend engineering with Django & DRF.",
            },
        )
        sql_skill, _ = Skill.objects.get_or_create(
            name="PostgreSQL & SQL",
            defaults={
                "category": "Data",
                "description": "Relational query optimization, indexing, and migrations.",
            },
        )
        sys_skill, _ = Skill.objects.get_or_create(
            name="System Design",
            defaults={
                "category": "Architecture",
                "description": "Scalable distributed architecture and caching.",
            },
        )
        react_skill, _ = Skill.objects.get_or_create(
            name="React & Next.js",
            defaults={
                "category": "Frontend",
                "description": "Next.js App Router, TypeScript, and TanStack Query.",
            },
        )

        # Role requirements for target role (Senior Backend Developer)
        senior_role = roles["Senior Backend Developer"]
        RoleSkill.objects.get_or_create(
            role=senior_role,
            skill=py_skill,
            defaults={"required_level": 4, "weight": 5, "is_must_have": True},
        )
        RoleSkill.objects.get_or_create(
            role=senior_role,
            skill=sql_skill,
            defaults={"required_level": 4, "weight": 4, "is_must_have": True},
        )
        RoleSkill.objects.get_or_create(
            role=senior_role,
            skill=sys_skill,
            defaults={"required_level": 4, "weight": 5, "is_must_have": True},
        )

        # Validated assessments for Rahul
        SkillAssessment.objects.get_or_create(
            employee=rahul_emp,
            skill=py_skill,
            defaults={
                "level": 3,
                "status": SkillAssessmentStatus.VALIDATED,
                "source": SkillAssessmentSource.MANAGER,
                "validated_by": mgr_user,
            },
        )
        SkillAssessment.objects.get_or_create(
            employee=rahul_emp,
            skill=sql_skill,
            defaults={
                "level": 3,
                "status": SkillAssessmentStatus.VALIDATED,
                "source": SkillAssessmentSource.MANAGER,
                "validated_by": mgr_user,
            },
        )
        SkillAssessment.objects.get_or_create(
            employee=rahul_emp,
            skill=sys_skill,
            defaults={
                "level": 2,
                "status": SkillAssessmentStatus.PENDING,
                "source": SkillAssessmentSource.SELF,
            },
        )

        # Review Cycle & Review
        today = timezone.now().date()
        cycle, _ = ReviewCycle.objects.get_or_create(
            name="H2 2026 Annual Performance Cycle",
            defaults={
                "cycle_type": CycleType.ANNUAL,
                "start_date": today - datetime.timedelta(days=60),
                "end_date": today + datetime.timedelta(days=30),
                "self_assessment_due": today + datetime.timedelta(days=10),
                "manager_review_due": today + datetime.timedelta(days=20),
                "status": CycleStatus.ACTIVE,
            },
        )
        cycle.departments.add(departments["Engineering"])

        rev, _ = PerformanceReview.objects.get_or_create(
            employee=rahul_emp,
            cycle=cycle,
            defaults={
                "reviewer": mgr_emp,
                "status": ReviewStatus.SELF_ASSESSMENT,
            },
        )

        # Goals for Rahul
        Goal.objects.get_or_create(
            owner=rahul_emp,
            cycle=cycle,
            title="Deliver High-Performance Goals & Analytics Backend APIs",
            defaults={
                "goal_type": GoalType.KPI,
                "direction": GoalDirection.HIGHER_BETTER,
                "weight": Decimal("40.00"),
                "target_value": Decimal("100.00"),
                "current_value": Decimal("90.00"),
                "status": GoalStatus.ACTIVE,
                "due_date": today + datetime.timedelta(days=15),
            },
        )
        Goal.objects.get_or_create(
            owner=rahul_emp,
            cycle=cycle,
            title="Complete System Design & Distributed Caching Certification",
            defaults={
                "goal_type": GoalType.DEVELOPMENTAL,
                "direction": GoalDirection.HIGHER_BETTER,
                "weight": Decimal("30.00"),
                "target_value": Decimal("100.00"),
                "current_value": Decimal("80.00"),
                "status": GoalStatus.ACTIVE,
                "due_date": today + datetime.timedelta(days=20),
            },
        )
        Goal.objects.get_or_create(
            owner=rahul_emp,
            cycle=cycle,
            title="Optimize PostgreSQL Query Indexes for Core Tenant Models",
            defaults={
                "goal_type": GoalType.OKR,
                "direction": GoalDirection.HIGHER_BETTER,
                "weight": Decimal("30.00"),
                "target_value": Decimal("100.00"),
                "current_value": Decimal("100.00"),
                "status": GoalStatus.COMPLETED,
                "due_date": today - datetime.timedelta(days=5),
            },
        )

        # Courses & Enrollments
        course1, _ = Course.objects.get_or_create(
            title="Advanced System Design & Scalability Patterns",
            defaults={
                "provider": "Acme Internal Engineering",
                "difficulty": CourseDifficulty.ADVANCED,
                "format": CourseFormat.SELF_PACED,
                "duration_hours": Decimal("16.0"),
                "description": "Deep dive into distributed systems, Redis caching, and resilient database design.",
                "is_active": True,
            },
        )
        CourseSkill.objects.get_or_create(
            course=course1, skill=sys_skill, defaults={"level_from": 2, "level_to": 4}
        )

        course2, _ = Course.objects.get_or_create(
            title="Next.js App Router Architecture & TanStack Query",
            defaults={
                "provider": "Frontend Masters",
                "difficulty": CourseDifficulty.INTERMEDIATE,
                "format": CourseFormat.ONLINE,
                "duration_hours": Decimal("12.0"),
                "description": "Mastering modern React patterns, server rendering, and server-state caching.",
                "is_active": True,
            },
        )
        CourseSkill.objects.get_or_create(
            course=course2, skill=react_skill, defaults={"level_from": 2, "level_to": 4}
        )

        Enrollment.objects.get_or_create(
            employee=rahul_emp,
            course=course1,
            defaults={"status": EnrollmentStatus.ENROLLED, "progress_pct": 60},
        )

        # Development Plan
        dev_plan, _ = DevelopmentPlan.objects.get_or_create(
            employee=rahul_emp,
            defaults={
                "target_role": senior_role,
                "status": DevelopmentPlanStatus.ACTIVE,
                "start_date": today - datetime.timedelta(days=30),
                "target_date": today + datetime.timedelta(days=120),
            },
        )
        DevelopmentPlanItem.objects.get_or_create(
            plan=dev_plan,
            title="Complete System Design Distributed Caching Certification",
            defaults={
                "item_type": "COURSE",
                "status": DevelopmentPlanItemStatus.IN_PROGRESS,
                "due_date": today + datetime.timedelta(days=45),
            },
        )
        DevelopmentPlanItem.objects.get_or_create(
            plan=dev_plan,
            title="Lead PostgreSQL Indexing Benchmark on Performance Reviews Table",
            defaults={
                "item_type": "PROJECT",
                "status": DevelopmentPlanItemStatus.PLANNED,
                "due_date": today + datetime.timedelta(days=60),
            },
        )

        # Badges & Recognitions
        badge_tech, _ = Badge.objects.get_or_create(
            name="Technical Excellence",
            defaults={"description": "Awarded for exceptional engineering rigor and quality."},
        )
        Recognition.objects.get_or_create(
            from_employee=mgr_emp,
            to_employee=rahul_emp,
            badge=badge_tech,
            defaults={
                "message": "Outstanding work designing and delivering the goals engine with cycle prevention!"
            },
        )

        # Feedback
        Feedback.objects.get_or_create(
            from_user=mgr_user,
            to_employee=rahul_emp,
            feedback_type=FeedbackType.STRENGTHS,
            defaults={
                "visibility": FeedbackVisibility.EMPLOYEE_VISIBLE,
                "content": "Rahul demonstrated deep initiative on the architecture refactor, taking full ownership of edge cases.",
            },
        )

        # 1:1 Meeting & Action Items
        meeting, _ = OneOnOne.objects.get_or_create(
            employee=rahul_emp,
            manager=mgr_emp,
            defaults={
                "scheduled_at": timezone.now() + datetime.timedelta(days=3, hours=2),
                "status": "SCHEDULED",
                "shared_notes": "Discuss Q4 backend milestones, promotion readiness criteria, and System Design course progress.",
            },
        )
        ActionItem.objects.get_or_create(
            one_on_one=meeting,
            owner=rahul_emp,
            title="Finalize benchmark comparison between btree and hash indexes on goals table",
            defaults={"status": "IN_PROGRESS", "due_date": today + datetime.timedelta(days=7)},
        )

        # Audit Logs
        AuditLog.objects.get_or_create(
            action=AuditAction.ORG_SETTINGS_CHANGED,
            entity_type="Organization",
            entity_id=str(org.id),
            defaults={
                "actor": hr_user,
                "entity_label": "Acme Corporation",
                "summary": "Updated performance rating scale anchors and 5-point calibration rubric.",
                "before": {"rating_scale_max": 5, "goal_score_cap": "1.00"},
                "after": {"rating_scale_max": 5, "goal_score_cap": "1.20"},
                "changes": [{"field": "goal_score_cap", "before": "1.00", "after": "1.20"}],
            },
        )
        AuditLog.objects.get_or_create(
            action=AuditAction.EMPLOYEE_CREATED,
            entity_type="Employee",
            entity_id=str(rahul_emp.id),
            defaults={
                "actor": hr_user,
                "entity_label": rahul_emp.name,
                "summary": "Onboarded Rahul Sharma into Engineering department.",
            },
        )
        AuditLog.objects.get_or_create(
            action=AuditAction.CALIBRATION_PROPOSED,
            entity_type="PerformanceReview",
            entity_id=str(rev.id),
            defaults={
                "actor": hr_user,
                "entity_label": f"Review: {rahul_emp.name}",
                "summary": "Proposed calibrated rating of 4 (Meets Expectations) with note.",
                "before": {"calibrated_rating": None},
                "after": {"calibrated_rating": 4},
                "changes": [{"field": "calibrated_rating", "before": None, "after": 4}],
            },
        )

        # Reports
        ReportJob.objects.get_or_create(
            report_type="PERFORMANCE_SUMMARY",
            format=ReportFormat.CSV,
            defaults={
                "requested_by": hr_user,
                "status": ReportStatus.SUCCEEDED,
                "progress_pct": 100,
                "started_at": timezone.now() - datetime.timedelta(hours=2),
                "finished_at": timezone.now() - datetime.timedelta(hours=2),
            },
        )
        ReportJob.objects.get_or_create(
            report_type="HEADCOUNT_HIERARCHY",
            format=ReportFormat.PDF,
            defaults={
                "requested_by": hr_user,
                "status": ReportStatus.SUCCEEDED,
                "progress_pct": 100,
                "started_at": timezone.now() - datetime.timedelta(days=1),
                "finished_at": timezone.now() - datetime.timedelta(days=1),
            },
        )

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully!"))
        self.stdout.write("Credentials:")
        self.stdout.write(f"  HR Admin:  hr@acme.com / {demo_password}")
        self.stdout.write(f"  Executive: exec@acme.com / {demo_password}")
        self.stdout.write(f"  Manager:   manager@acme.com / {demo_password}")
        self.stdout.write(f"  Employee:  rahul@acme.com / {demo_password}")
