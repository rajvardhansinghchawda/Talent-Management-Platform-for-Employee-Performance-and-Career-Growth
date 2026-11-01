from django.contrib import admin

from .models import Department, Organization

admin.site.register(Organization)
admin.site.register(Department)
