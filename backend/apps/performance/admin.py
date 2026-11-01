from django.contrib import admin

from .models import (
    Goal,
    GoalComment,
    GoalUpdate,
    PerformanceReview,
    ReviewCalibrationEntry,
    ReviewCycle,
)

admin.site.register(ReviewCycle)
admin.site.register(Goal)
admin.site.register(GoalUpdate)
admin.site.register(GoalComment)
admin.site.register(PerformanceReview)
admin.site.register(ReviewCalibrationEntry)
