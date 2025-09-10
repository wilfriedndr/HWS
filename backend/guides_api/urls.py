from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GuideViewSet, ActivityViewSet, GuideInvitationViewSet, me

router = DefaultRouter()


router.register(r"guides", GuideViewSet, basename="guide")
router.register(r"activites", ActivityViewSet, basename="activite")
router.register(r"invitations", GuideInvitationViewSet, basename="invitation")

urlpatterns = [
    path("me/", me, name="me"),
    path("", include(router.urls)),
]