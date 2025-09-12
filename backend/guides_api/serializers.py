from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Guide, Activity, GuideInvitation


class ActivitySerializer(serializers.ModelSerializer):
    guide = serializers.PrimaryKeyRelatedField(
        queryset=Guide.objects.all(),
        required=True,
        help_text="ID du guide auquel rattacher l'activité"
    )

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

    def validate(self, attrs):
        if attrs.get("day", 1) < 1:
            raise serializers.ValidationError({"day": "Le jour doit être >= 1."})
        if attrs.get("order", 1) < 1:
            raise serializers.ValidationError({"order": "L'ordre doit être >= 1."})
        return attrs


class MinimalUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "is_active", "is_staff"]
        read_only_fields = ["id", "role", "is_active", "is_staff"]

    def get_role(self, obj):
        return "admin" if (obj.is_staff or obj.is_superuser) else "user"


class GuideInvitationSerializer(serializers.ModelSerializer):
    invited_user = MinimalUserSerializer(read_only=True)
    invited_user_id = serializers.PrimaryKeyRelatedField(
        source="invited_user",
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
        help_text="ID d'un utilisateur déjà existant à inviter"
    )

    class Meta:
        model = GuideInvitation
        fields = ["id", "guide", "invited_user", "invited_user_id", "invited_email", "created_at"]
        read_only_fields = ["id", "created_at"]


class GuideSerializer(serializers.ModelSerializer):
    activities = ActivitySerializer(many=True, read_only=True)
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    activities_by_day = serializers.SerializerMethodField()

    name = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    category_display = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()

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
            "owner_username",
            "created_at",
            "updated_at",
            "activities",
            "activities_by_day",
            "name",
            "city",
            "category_display",
            "price",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]

    def get_name(self, obj):
        return getattr(obj, "name", None) or getattr(obj, "title", None)

    def get_city(self, obj):
        return getattr(obj, "city", None) or getattr(obj, "location", None)

    def get_category_display(self, obj):
        return getattr(obj, "category", None)

    def get_price(self, obj):
        return getattr(obj, "price", None)

    def get_activities_by_day(self, obj):
        """Organise les activités par jour pour le détail."""
        activities_by_day = {}
        for activity in obj.activities.all():
            day = activity.day
            if day not in activities_by_day:
                activities_by_day[day] = []
            activities_by_day[day].append(ActivitySerializer(activity).data)
        return activities_by_day

    def create(self, validated_data):
        request = self.context.get("request", None)
        if request and getattr(request, "user", None):
            validated_data["owner"] = request.user
        else:
            raise serializers.ValidationError("Utilisateur non authentifié")
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
        return UserBaseSerializer(instance, context=self.context).data


class UserUpdateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=["admin", "user"], write_only=True, required=False)
    password = serializers.CharField(write_only=True, min_length=8, required=False)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "role", "is_active"]
        read_only_fields = ["id"]

    def update(self, instance, validated_data):
        role = validated_data.pop("role", None)
        password = validated_data.pop("password", None)

        if role is not None:
            instance.is_staff = (role == "admin")

        if password:
            instance.set_password(password)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance

    def to_representation(self, instance):
        return UserBaseSerializer(instance, context=self.context).data
