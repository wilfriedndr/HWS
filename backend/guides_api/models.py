from django.db import models
from django.contrib.auth.models import User


class Guide(models.Model):
    class Mobility(models.TextChoices):
        VOITURE = "voiture", "Voiture"
        VELO = "vélo", "Vélo"
        PIED = "à pied", "À pied"
        MOTO = "moto", "Moto"
        TRANSPORT_PUBLIC = "transport public", "Transport public"

    class Season(models.TextChoices):
        ETE = "été", "Été"
        PRINTEMPS = "printemps", "Printemps"
        AUTOMNE = "automne", "Automne"
        HIVER = "hiver", "Hiver"

    class Audience(models.TextChoices):
        FAMILLE = "famille", "Famille"
        SEUL = "seul", "Seul"
        GROUPE = "en groupe", "En groupe"
        AMIS = "entre amis", "Entre amis"

    title = models.CharField("Titre", max_length=200)
    description = models.TextField("Description")
    days = models.PositiveIntegerField("Nombre de jours")
    mobility = models.CharField("Mobilité", max_length=20, choices=Mobility.choices)
    season = models.CharField("Saison", max_length=15, choices=Season.choices)
    audience = models.CharField("Public", max_length=15, choices=Audience.choices)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="owned_guides")
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
    invited_user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name="guide_invitations"
    )
    invited_email = models.EmailField("Email invité", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [
            ("guide", "invited_user"),
            ("guide", "invited_email"),
        ]

    def __str__(self):
        if self.invited_user:
            return f"{self.guide.title} → {self.invited_user.username}"
        return f"{self.guide.title} → {self.invited_email}"
