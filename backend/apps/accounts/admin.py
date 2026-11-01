from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "role", "is_active", "must_change_password", "created_at"]
    list_filter = ["role", "is_active", "must_change_password"]
    search_fields = ["email"]
    ordering = ["-created_at"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Role & Status", {"fields": ("role", "is_active", "is_staff", "must_change_password")}),
        ("Timestamps", {"fields": ("created_at", "updated_at", "last_login_at")}),
        ("Security", {"fields": ("failed_login_attempts", "locked_until")}),
    )
    readonly_fields = ["created_at", "updated_at", "last_login_at"]
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "role"),
            },
        ),
    )
