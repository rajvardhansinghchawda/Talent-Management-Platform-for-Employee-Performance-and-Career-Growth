from django.contrib import admin

from .models import Course, CourseSkill, Enrollment

admin.site.register(Course)
admin.site.register(CourseSkill)
admin.site.register(Enrollment)
