from django.contrib import admin
from .models import Guide, Activity, GuideInvitation


@admin.register(Guide)
class GuideAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "owner", "days", "mobility", "season", "audience", "created_at")
    list_filter = ("mobility", "season", "audience")
    search_fields = ("title", "description", "owner__username")


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "guide", "day", "order", "category")
    list_filter = ("category", "day")
    search_fields = ("title", "description", "guide__title")


@admin.register(GuideInvitation)
class GuideInvitationAdmin(admin.ModelAdmin):
    list_display = ("id", "guide", "invited_email", "invited_user", "created_at")
    search_fields = ("invited_email", "guide__title", "invited_user__username")
