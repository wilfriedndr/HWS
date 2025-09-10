#!/usr/bin/env bash
set -e

python manage.py migrate --noinput

# Création superuser + user non admin + seed
python - <<'PY'
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
import django
django.setup()

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from guides_api.models import Guide, Activity, GuideInvitation

User = get_user_model()

# Superuser (is_staff=True, is_superuser=True)
su_username = os.getenv("DJANGO_SUPERUSER_USERNAME", "admin")
su_email    = os.getenv("DJANGO_SUPERUSER_EMAIL", "admin@example.com")
su_password = os.getenv("DJANGO_SUPERUSER_PASSWORD", "admin")

try:
    su, created = User.objects.get_or_create(
        username=su_username,
        defaults={"email": su_email, "is_staff": True, "is_superuser": True}
    )
    if created:
        su.set_password(su_password)
        su.save()
        print(f"[seed] Superuser créé: {su_username}/{su_password}")
    else:
        changed = False
        if not su.is_staff:
            su.is_staff = True; changed = True
        if not su.is_superuser:
            su.is_superuser = True; changed = True
        if changed:
            su.save()
        print("[seed] Superuser déjà présent")
except IntegrityError as e:
    print(f"[seed] Problème création superuser: {e}")

# Utilisateur non admin (is_staff=False, is_superuser=False)
demo_username = os.getenv("DJANGO_DEMO_USERNAME", "demouser")
demo_email    = os.getenv("DJANGO_DEMO_EMAIL", "demo@example.com")
demo_password = os.getenv("DJANGO_DEMO_PASSWORD", "demo")

demo, demo_created = User.objects.get_or_create(
    username=demo_username,
    defaults={"email": demo_email, "is_active": True, "is_staff": False, "is_superuser": False}
)
if demo_created:
    demo.set_password(demo_password)
    demo.save()
    print(f"[seed] Utilisateur simple créé: {demo_username}/{demo_password}")
else:
    # S'assure qu'il n'a pas les droits admin
    changed = False
    if demo.is_staff or demo.is_superuser:
        demo.is_staff = False
        demo.is_superuser = False
        changed = True
    if changed:
        demo.save()
    print("[seed] Utilisateur simple déjà présent")

# Seed minimal: 1 guide + activités + invitation pour le user non admin
if not Guide.objects.exists():
    owner = User.objects.filter(is_staff=True).first() or User.objects.first()
    g = Guide.objects.create(
        title="Week-end à Bordeaux",
        description="Découverte de la ville, dégustation, balades.",
        days=2,
        mobility="voiture",
        season="ete",
        audience="amis",
        owner=owner,
    )
    Activity.objects.create(
        guide=g, title="Place de la Bourse", description="Miroir d'eau", category="activite", day=1, order=1
    )
    Activity.objects.create(
        guide=g, title="Cité du Vin", description="Visite et dégustation", category="musee", day=1, order=2
    )
    Activity.objects.create(
        guide=g, title="Dune du Pilat", description="Vue panoramique", category="activite", day=2, order=1
    )
    # Invitation de l'utilisateur non admin sur ce guide
    GuideInvitation.objects.get_or_create(guide=g, invited_email=demo_email)
    print("[seed] Données de démo créées + invitation envoyée au user non admin")
else:
    # Optionnel: s'assurer que le user non admin est invité à AU MOINS un guide
    g = Guide.objects.first()
    GuideInvitation.objects.get_or_create(guide=g, invited_email=demo_email)
    print("[seed] Données déjà présentes, invitation du user non admin garantie")
PY

# Lance le serveur
exec python -m gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers 3
