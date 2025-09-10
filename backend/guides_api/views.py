from django.db.models import Q
from rest_framework import viewsets, mixins, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.contrib.auth import get_user_model

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


def visible_guides_q(user, prefix=""):
    """
    Q pour filtrer les Guides visibles par `user`.

    Règle appliquée :
    - Admins (is_staff) verront tout (géré dans get_queryset, pas ici).
    - Non-admins ne voient QUE les guides où :
        - ils sont invités via invited_user
        - ou ils sont invités via invited_email (comparaison case-insensitive)
    - prefix permet d'utiliser la même Q pour les Activity queryset (ex: prefix="guide__")
    """
    q = Q(**{f"{prefix}invitations__invited_user": user})
    user_email = getattr(user, "email", None)
    if user_email:
        q = q | Q(**{f"{prefix}invitations__invited_email__iexact": user_email})
    return q


class GuideViewSet(viewsets.ModelViewSet):
    """
    - Admin: CRUD complet sur les guides
    - Non-admin: lecture uniquement des guides où il est invité
    """
    queryset = Guide.objects.all()
    serializer_class = GuideSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset().select_related("owner")
        if not user or not user.is_authenticated:
            return qs.none()
        if user.is_staff:
            return qs.distinct()
        return qs.filter(visible_guides_q(user)).distinct()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.select_related("guide").all()
    serializer_class = ActivitySerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if not user or not user.is_authenticated:
            return qs.none()
        if user.is_staff:
            return qs.distinct()
        return qs.filter(visible_guides_q(user, prefix="guide__")).distinct()


class GuideInvitationViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    """
    - Admin: lister/créer/supprimer des invitations pour un guide
    - Utilisateur: lecture seule des invitations visibles
    """
    serializer_class = GuideInvitationSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = GuideInvitation.objects.select_related("guide", "invited_user")
        if user.is_staff:
            return qs
        return qs.filter(Q(invited_user=user) | Q(invited_email__iexact=user.email) | Q(guide__owner=user)).distinct()


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    u = request.user
    role = "admin" if (u.is_staff or u.is_superuser) else "user"
    return Response(
        {
            "id": u.id,
            "username": u.username or "",
            "email": u.email or "",
            "role": role,
            "is_staff": u.is_staff,
        },
        status=200,
    )


class UserViewSet(viewsets.ModelViewSet):
    """
    Admin uniquement: CRUD des utilisateurs
    """
    queryset = User.objects.all().order_by("id")
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ("update", "partial_update"):
            return UserUpdateSerializer
        return UserBaseSerializer
