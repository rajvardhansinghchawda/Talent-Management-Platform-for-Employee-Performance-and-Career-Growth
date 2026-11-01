from django.contrib import admin

from .models import CareerPathStep, JobRole, RoleSkill, Skill, SkillAssessment

admin.site.register(Skill)
admin.site.register(JobRole)
admin.site.register(RoleSkill)
admin.site.register(CareerPathStep)
admin.site.register(SkillAssessment)
