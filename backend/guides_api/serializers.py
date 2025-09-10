from rest_framework import serializers
from .models import Guide, Activity, GuideInvitation
from django.contrib.auth import get_user_model


User = get_user_model()


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

class UserBaseSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "is_active"]
        read_only_fields = ["id", "role"]

    def get_role(self, obj):
        return "admin" if (obj.is_staff or obj.is_superuser) else "user"


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    # rendre role write_only pour ne pas tenter de le lire depuis l'instance
    role = serializers.ChoiceField(choices=["admin", "user"], write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "role", "is_active"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        role = validated_data.pop("role")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.is_staff = (role == "admin")
        user.set_password(password)
        user.save()
        return user

    def to_representation(self, instance):
        # pour la réponse, réutiliser le serializer "lecture" (UserBaseSerializer)
        return UserBaseSerializer(instance, context=self.context).data


class UserUpdateSerializer(serializers.ModelSerializer):
    # champ role en entrée uniquement
    role = serializers.ChoiceField(choices=["admin", "user"], required=False, write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "role", "is_active"]

    def update(self, instance, validated_data):
        role = validated_data.pop("role", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if role is not None:
            instance.is_staff = (role == "admin")
        instance.save()
        return instance

    def to_representation(self, instance):
        return UserBaseSerializer(instance, context=self.context).data

