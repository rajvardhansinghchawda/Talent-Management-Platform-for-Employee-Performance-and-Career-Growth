from django.contrib import admin

from .models import ActionItem, Badge, Feedback, FeedbackRequest, OneOnOne, Recognition

admin.site.register(Feedback)
admin.site.register(FeedbackRequest)
admin.site.register(Badge)
admin.site.register(Recognition)
admin.site.register(OneOnOne)
admin.site.register(ActionItem)
