from django.conf import settings
from django.db import models


class Guide(models.Model):
    class Mobilite(models.TextChoices):
        VOITURE = "voiture", "Voiture"
        VELO = "velo", "Vélo"
        PIED = "pied", "À pied"
        MOTO = "moto", "Moto"


    class Saison(models.TextChoices):
        ETE = "ete", "Été"
        PRINTEMPS = "printemps", "Printemps"
        AUTOMNE = "automne", "Automne"
        HIVER = "hiver", "Hiver"

    class Audience(models.TextChoices):
        FAMILLE = "famille", "Famille"
        SEUL = "seul", "Seul"
        GROUPE = "groupe", "En groupe"
        AMIS = "amis", "Entre amis"

    title = models.CharField("Titre", max_length=200)
    description = models.TextField("Description", blank=True)
    days = models.PositiveIntegerField("Nombre de jours", default=1)
    mobility = models.CharField("Mobilité", max_length=10, choices=Mobilite.choices)
    season = models.CharField("Saison", max_length=12, choices=Saison.choices)
    audience = models.CharField("Pour qui", max_length=12, choices=Audience.choices)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="guides_possedes"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


class Activity(models.Model):
    class Categorie(models.TextChoices):
        MUSEE = "musee", "Musée"
        CHATEAU = "chateau", "Château"
        ACTIVITE_NAUTIQUE = "activite nautique", "Activité nautique"
        PARC = "parc", "Parc"
        GROTTE = "grotte", "Grotte"
        PLAGE = "plage", "Plage"
        FESTIVAL = "festival", "Festival"
        ZOO = "zoo", "Zoo"
        AQUARIUM = "aquarium", "Aquarium"
        VISITE_GUIDEE = "visite guidee", "Visite guidée"
        VIGNOBLE = "vignoble", "Vignoble"
        

    guide = models.ForeignKey(Guide, on_delete=models.CASCADE, related_name="activities")
    title = models.CharField("Titre", max_length=200)
    description = models.TextField("Description", blank=True)
    category = models.CharField("Catégorie", max_length=20, choices=Categorie.choices)
    address = models.CharField("Adresse", max_length=255, blank=True)
    phone = models.CharField("Téléphone", max_length=30, blank=True)
    opening_hours = models.CharField("Horaires d'ouverture", max_length=255, blank=True)
    website = models.URLField("Site internet", blank=True)
    day = models.PositiveIntegerField("Jour", default=1)
    order = models.PositiveIntegerField("Ordre de visite", default=1)

    class Meta:
        ordering = ["day", "order", "id"]

    def __str__(self) -> str:
        return f"{self.title} (J{self.day} #{self.order})"


class GuideInvitation(models.Model):
    guide = models.ForeignKey(Guide, on_delete=models.CASCADE, related_name="invitations")
    invited_email = models.EmailField("Email invité")
    invited_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True, on_delete=models.SET_NULL,
        related_name="invitations_recues",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("guide", "invited_email")
        verbose_name = "Invitation de guide"
        verbose_name_plural = "Invitations de guide"

    def __str__(self) -> str:
        return f"{self.invited_email} -> {self.guide.title}"
