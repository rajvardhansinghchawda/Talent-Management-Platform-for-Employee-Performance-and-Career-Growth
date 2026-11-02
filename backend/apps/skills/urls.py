"""URLs for Skills and Job Roles."""

from django.urls import path

from . import views

urlpatterns = [
    # Skills
    path("skills/", views.SkillListCreateView.as_view(), name="skill-list-create"),
    path("skills/<uuid:pk>/", views.SkillDetailView.as_view(), name="skill-detail"),
    path(
        "skills/<uuid:pk>/deactivate/",
        views.SkillDeactivateView.as_view(),
        name="skill-deactivate",
    ),
    # Gap Analysis & Employee Skills
    path("skills/gaps/", views.SkillGapAnalysisView.as_view(), name="skill-gap-analysis"),
    path(
        "employees/me/skills/", views.EmployeeSkillsListView.as_view(), name="employee-skills-list"
    ),
    # Skill Assessments / Validation Queue
    path("skill-assessments/", views.SkillAssessmentListView.as_view(), name="skill-assessments-list"),
    path(
        "skill-assessments/<uuid:pk>/validate/",
        views.SkillAssessmentValidateView.as_view(),
        name="skill-assessment-validate",
    ),
    path(
        "skill-assessments/<uuid:pk>/reject/",
        views.SkillAssessmentRejectView.as_view(),
        name="skill-assessment-reject",
    ),
    path(
        "skill-assessments/bulk-validate/",
        views.SkillAssessmentBulkValidateView.as_view(),
        name="skill-assessment-bulk-validate",
    ),
    # Job Roles
    path("job-roles/", views.JobRoleListCreateView.as_view(), name="job-role-list-create"),
    path("job-roles/<uuid:pk>/", views.JobRoleDetailView.as_view(), name="job-role-detail"),
    path(
        "job-roles/<uuid:pk>/skills/",
        views.JobRoleSkillsView.as_view(),
        name="job-role-skills",
    ),
    path(
        "job-roles/<uuid:pk>/skills/<uuid:skill_id>/",
        views.JobRoleSkillItemView.as_view(),
        name="job-role-skill-item",
    ),
    path(
        "job-roles/<uuid:pk>/next-roles/",
        views.JobRoleCareerStepsView.as_view(),
        name="job-role-career-steps",
    ),
    path(
        "job-roles/<uuid:pk>/next-roles/<uuid:to_role_id>/",
        views.JobRoleCareerStepItemView.as_view(),
        name="job-role-career-step-item",
    ),
]
