from django.contrib import admin

from .models import ImportJob, ReportJob

admin.site.register(ReportJob)
admin.site.register(ImportJob)
