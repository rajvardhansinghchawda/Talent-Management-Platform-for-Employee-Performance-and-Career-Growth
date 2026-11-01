from django.contrib import admin

from .models import DevelopmentPlan, DevelopmentPlanItem, PromotionReviewFlag, ReadinessSnapshot

admin.site.register(DevelopmentPlan)
admin.site.register(DevelopmentPlanItem)
admin.site.register(ReadinessSnapshot)
admin.site.register(PromotionReviewFlag)
