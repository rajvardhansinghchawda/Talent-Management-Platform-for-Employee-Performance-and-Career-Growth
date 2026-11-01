from django.contrib import admin

from .models import Employee, ManagerHistory
from .role_history import EmployeeRoleHistory

admin.site.register(Employee)
admin.site.register(ManagerHistory)
admin.site.register(EmployeeRoleHistory)
