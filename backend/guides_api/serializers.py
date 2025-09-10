from rest_framework import serializers
from .models import Guide, Activity, GuideInvitation


class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = [
            "id",
            "guide",
            "title",
            "description",
            "category",
            "address",
            "phone",
            "opening_hours",
            "website",
            "day",
            "order",
        ]
        read_only_fields = ["id"]


class GuideInvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuideInvitation
        fields = ["id", "guide", "invited_email", "invited_user", "created_at"]
        read_only_fields = ["id", "invited_user", "created_at"]


class GuideSerializer(serializers.ModelSerializer):
    activities = ActivitySerializer(many=True, read_only=True)

    class Meta:
        model = Guide
        fields = [
            "id",
            "title",
            "description",
            "days",
            "mobility",
            "season",
            "audience",
            "owner",
            "created_at",
            "updated_at",
            "activities",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at", "activities"]

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["owner"] = request.user
        return super().create(validated_data)

