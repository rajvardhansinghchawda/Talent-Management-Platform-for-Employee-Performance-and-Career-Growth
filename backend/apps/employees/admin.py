from django.contrib import admin

from .models import Employee
from .role_history import EmployeeRoleHistory

admin.site.register(Employee)
admin.site.register(EmployeeRoleHistory)
