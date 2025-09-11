from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import viewsets, mixins, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response

from .models import Guide, Activity, GuideInvitation
from .serializers import (
    GuideSerializer,
    ActivitySerializer,
    GuideInvitationSerializer,
    UserBaseSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
)
from .permissions import IsAdminOrReadOnly

User = get_user_model()


def visible_guides_q(user, prefix: str = "") -> Q:
    """
    Q pour filtrer les Guides visibles par `user` (non-admin).
    - Invité via invited_user
    - Invité via invited_email (case-insensitive)
    prefix permet d'appliquer sur Activity (prefix="guide__").
    """
    q = Q(**{f"{prefix}invitations__invited_user": user})
    email = getattr(user, "email", None)
    if email:
        q |= Q(**{f"{prefix}invitations__invited_email__iexact": email})
    q |= Q(**{f"{prefix}owner": user})
    return q


class GuideViewSet(viewsets.ModelViewSet):
    queryset = Guide.objects.all().prefetch_related("activities", "invitations")
    serializer_class = GuideSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        return self.queryset.filter(visible_guides_q(user)).distinct()


class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.all().select_related("guide")
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        return self.queryset.filter(visible_guides_q(user, prefix="guide__")).distinct()


class GuideInvitationViewSet(viewsets.ModelViewSet):
    queryset = GuideInvitation.objects.all().select_related("guide", "invited_user")
    serializer_class = GuideInvitationSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        return self.queryset.filter(guide__owner=user)


class UserViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return UserUpdateSerializer
        return UserBaseSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        return self.queryset.filter(id=user.id)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response(
                {"detail": "Permission non accordée."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response(
                {"detail": "Seuls les administrateurs peuvent créer des utilisateurs."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    """Retourne les infos de l'utilisateur connecté"""
    serializer = UserBaseSerializer(request.user)
    return Response(serializer.data)
