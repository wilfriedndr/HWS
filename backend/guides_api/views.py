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
    # Un owner non-admin peut aussi voir ses propres guides
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
    queryset = Activity.objects.select_related("guide").all()
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        return self.queryset.filter(visible_guides_q(user, prefix="guide__")).distinct()


class GuideInvitationViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    """
    - Admin: créer/supprimer/list
    - Non-admin: lecture seulement des invitations qui le concernent (ou ses guides s'il est owner)
    """
    serializer_class = GuideInvitationSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = GuideInvitation.objects.select_related("guide", "invited_user")
        if user.is_staff:
            return qs
        return qs.filter(
            Q(invited_user=user)
            | Q(invited_email__iexact=getattr(user, "email", "") or "___noemail___")
            | Q(guide__owner=user)
        ).distinct()

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def accept(self, request, pk=None):
        """
        Acceptation par l'utilisateur connecté si l'invitation correspond à son email.
        """
        inv: GuideInvitation = self.get_object()
        user = request.user
        email = (user.email or "").lower()
        if not email or inv.invited_email.lower() != email:
            return Response({"detail": "Cette invitation ne correspond pas à votre email."}, status=403)
        inv.invited_user = user
        inv.save(update_fields=["invited_user"])
        return Response({"status": "accepted"}, status=200)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    u = request.user
    role = "admin" if (u.is_staff or u.is_superuser) else "user"
    data = {
        "id": u.id,
        "username": u.username or "",
        "email": u.email or "",
        "role": role,
        "is_staff": u.is_staff,
    }
    return Response(data, status=200)


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
