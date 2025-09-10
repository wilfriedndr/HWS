from django.db.models import Q, Prefetch
from rest_framework import viewsets, mixins, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from .models import Guide, Activity, GuideInvitation
from .serializers import GuideSerializer, ActivitySerializer, GuideInvitationSerializer
from .permissions import IsAdminOrReadOnly


def visible_guides_q(user):
    """
    Règle métier visibilité:
    - Admin: tout voir
    - Sinon: guides dont il est owner
             ou avec une invitation liée à son user
             ou invitée sur son email
    """
    return Q(owner=user) | Q(invitations__invited_user=user) | Q(invitations__invited_email=user.email)


class GuideViewSet(viewsets.ModelViewSet):
    serializer_class = GuideSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        base = Guide.objects.all().select_related("owner").prefetch_related(
            Prefetch("activities", queryset=Activity.objects.order_by("day", "order", "id"))
        )
        user = self.request.user
        if user.is_staff:
            return base.distinct()
        return base.filter(visible_guides_q(user)).distinct()

    # Route : /api/guides/{id}/activities/
    @action(detail=True, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def activities(self, request, pk=None):
        guide = self.get_object()
        qs = guide.activities.all()
        serializer = ActivitySerializer(qs, many=True)
        return Response(serializer.data)


class ActivityViewSet(viewsets.ModelViewSet):
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = Activity.objects.select_related("guide")
        if user.is_staff:
            return qs
        return qs.filter(visible_guides_q(user)).distinct()


class GuideInvitationViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    """
    - Admin: lister/créer/supprimer des invitations pour un guide
    - Utilisateur: lecture seule des invitations visibles (pratique pour debug)
    """
    serializer_class = GuideInvitationSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = GuideInvitation.objects.select_related("guide", "invited_user")
        if user.is_staff:
            return qs
        return qs.filter(Q(invited_user=user) | Q(invited_email=user.email) | Q(guide__owner=user)).distinct()


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
