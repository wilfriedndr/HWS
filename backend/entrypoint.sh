#!/usr/bin/env bash
set -euo pipefail

# Variables par défaut (surchargées par l'env)
: "${DJANGO_SUPERUSER_USERNAME:=admin}"
: "${DJANGO_SUPERUSER_EMAIL:=admin@example.com}"
: "${DJANGO_SUPERUSER_PASSWORD:=admin}"

: "${DJANGO_DEMO_USERNAME:=demouser}"
: "${DJANGO_DEMO_EMAIL:=demo@example.com}"
: "${DJANGO_DEMO_PASSWORD:=demo}"

: "${SEED_ENABLED:=1}"
: "${SEED_FORCE:=0}"
: "${SEED_RESET:=0}"

echo "[entrypoint] Démarrage…"

# Attente DB via Django
python - <<'PY'
import os, time, sys
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
import django
django.setup()
from django.db import connections
from django.db.utils import OperationalError

for i in range(30):
    try:
        connections["default"].ensure_connection()
        print("[entrypoint] Base de données disponible.")
        break
    except OperationalError:
        print(f"[entrypoint] DB non disponible, tentative {i+1}/30…")
        time.sleep(1)
else:
    print("[entrypoint] Échec de connexion DB.", file=sys.stderr)
    sys.exit(1)
PY

# Migrations
echo "[entrypoint] Django migrate…"
python manage.py migrate --noinput

# Seed
if [ "${SEED_ENABLED}" = "1" ]; then
python - <<'PY'
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
import django
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from guides_api.models import Guide, Activity, GuideInvitation

User = get_user_model()

SU_USER = os.getenv("DJANGO_SUPERUSER_USERNAME", "admin")
SU_EMAIL = os.getenv("DJANGO_SUPERUSER_EMAIL", "admin@example.com")
SU_PASS  = os.getenv("DJANGO_SUPERUSER_PASSWORD", "admin")

DEMO_USER = os.getenv("DJANGO_DEMO_USERNAME", "demouser")
DEMO_EMAIL= os.getenv("DJANGO_DEMO_EMAIL", "demo@example.com")
DEMO_PASS = os.getenv("DJANGO_DEMO_PASSWORD", "demo")

SEED_FORCE = os.getenv("SEED_FORCE", "0") == "1"
SEED_RESET = os.getenv("SEED_RESET", "0") == "1"

def model_field_names(model):
    return {f.name for f in model._meta.get_fields() if hasattr(f, "attname")}

GUIDE_FIELDS = model_field_names(Guide)
ACTIVITY_FIELDS = model_field_names(Activity)
INVITATION_FIELDS = model_field_names(GuideInvitation)

def upsert_superuser():
    su, created = User.objects.get_or_create(
        username=SU_USER,
        defaults={"email": SU_EMAIL, "is_staff": True, "is_superuser": True, "is_active": True}
    )
    if created:
        su.set_password(SU_PASS); su.save()
        print(f"[seed] Superuser créé: {SU_USER}/{SU_PASS}")
    else:
        changed = False
        if not su.is_staff: su.is_staff = True; changed = True
        if not su.is_superuser: su.is_superuser = True; changed = True
        if changed: su.save()
        print("[seed] Superuser OK")
    return su

def upsert_demo_user():
    demo, created = User.objects.get_or_create(
        username=DEMO_USER,
        defaults={"email": DEMO_EMAIL, "is_active": True, "is_staff": False, "is_superuser": False}
    )
    if created:
        demo.set_password(DEMO_PASS); demo.save()
        print(f"[seed] Utilisateur simple créé: {DEMO_USER}/{DEMO_PASS}")
    else:
        if demo.is_staff or demo.is_superuser:
            demo.is_staff = False; demo.is_superuser = False; demo.save()
        print("[seed] Utilisateur simple OK")
    return demo

def normalize_categories():
    # exemple simple
    total = Activity.objects.filter(category="activite").update(category="visite")
    if total:
        print(f"[seed] Normalisation catégories: {total} MAJ")

# -------- Aliases intelligents pour compat modèle --------
def adapt_guide_payload(data: dict) -> dict:
    payload = dict(data)
    # rien de spécial ici, on filtre après
    return {k: v for k, v in payload.items() if k in GUIDE_FIELDS}

def adapt_activity_payload(guide, data: dict) -> dict:
    payload = dict(data)
    payload["guide"] = guide

    # hours -> opening_hours si le champ existe
    if "hours" in payload and "opening_hours" in ACTIVITY_FIELDS and "opening_hours" not in payload:
        payload["opening_hours"] = payload.pop("hours")

    # location: si le modèle n'a pas 'location' mais a 'address' et qu'address est vide, on peut mettre location dans address
    if "location" in payload and "location" not in ACTIVITY_FIELDS:
        if "address" in ACTIVITY_FIELDS and not payload.get("address"):
            payload["address"] = payload.pop("location")
        else:
            payload.pop("location")  # on retire si inutilisable

    # on retire les clés qui n'existent pas
    return {k: v for k, v in payload.items() if k in ACTIVITY_FIELDS or k == "guide"}

def adapt_invitation_payload(data: dict) -> dict:
    payload = dict(data)
    # on garde uniquement les champs existants
    return {k: v for k, v in payload.items() if k in INVITATION_FIELDS}

# -------- CRUD idempotent --------
def upsert_guide(lookup: dict, defaults: dict):
    clean_defaults = adapt_guide_payload(defaults)
    obj, created = Guide.objects.update_or_create(defaults=clean_defaults, **lookup)
    return obj, created

def create_activity(guide, **data):
    payload = adapt_activity_payload(guide, data)
    return Activity.objects.create(**payload)

def upsert_invitation(lookup: dict, defaults: dict):
    clean_defaults = adapt_invitation_payload(defaults)
    obj, created = GuideInvitation.objects.update_or_create(defaults=clean_defaults, **lookup)
    return obj, created

@transaction.atomic
def seed():
    if SEED_RESET:
        print("[seed] Purge Guide/Activity/GuideInvitation…")
        GuideInvitation.objects.all().delete()
        Activity.objects.all().delete()
        Guide.objects.all().delete()

    need_seed = SEED_FORCE or Guide.objects.count() == 0
    if not need_seed:
        print("[seed] Données présentes (SEED_FORCE=0).")
        # on s’assure au moins d’avoir une invitation de démo sur le 1er guide
        g = Guide.objects.order_by("id").first()
        if g:
            upsert_invitation(
                lookup={"guide": g, "invited_email": DEMO_EMAIL},
                defaults={}
            )
        return

    owner = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).first() or User.objects.first()

    # ----- Guide 1 -----
    g1, _ = upsert_guide(
        lookup={"title": "Week-end à Bordeaux"},
        defaults=dict(
            title="Week-end à Bordeaux",
            description="Découverte de la ville, dégustation, balades.",
            days=2,
            mobility="voiture",
            season="ete",
            audience="amis",
            owner=owner,
            # champs optionnels (seront ignorés si absents du modèle)
            location="Bordeaux",
            city="Bordeaux",
            category="decouverte",
            price=0,
        )
    )
    # activités
    create_activity(
        g1,
        title="Place de la Bourse",
        description="Visite du centre historique et miroir d'eau",
        category="visite",
        day=1, order=1,
        address="Place de la Bourse, 33000 Bordeaux",
        hours="10:00 - 12:00",
        website="https://www.bordeaux-tourisme.com/",
    )
    create_activity(
        g1,
        title="Cité du Vin",
        description="Musée et expériences autour du vin",
        category="musee",
        day=1, order=2,
        address="Esplanade de Pontac, 134 Quai de Bacalan, 33300 Bordeaux",
        hours="14:00 - 17:00",
        website="https://www.laciteduvin.com/",
        phone="+33556404630",
    )
    create_activity(
        g1,
        title="Dune du Pilat",
        description="Balade en bord de dune",
        category="visite",
        day=2, order=1,
        location="La Teste-de-Buch",
        hours="10:00 - 13:00",
        website="https://ladunedupilat.com/",
    )
    create_activity(
        g1,
        title="Vignobles du Médoc",
        description="Dégustation et découverte du terroir",
        category="vignoble",
        day=2, order=2,
        location="Médoc",
        hours="15:00 - 18:00",
    )

    # Invitation: si le champ invited_user existe, on lie au user de démo en plus de l'email
    demo = User.objects.filter(username=os.getenv("DJANGO_DEMO_USERNAME", "demouser")).first()
    invitation_defaults = {}
    if "invited_user" in INVITATION_FIELDS and demo:
        invitation_defaults["invited_user"] = demo
    upsert_invitation(
        lookup={"guide": g1, "invited_email": DEMO_EMAIL},
        defaults=invitation_defaults
    )

    # ----- Guide 2 -----
    g2, _ = upsert_guide(
        lookup={"title": "Paris en 1 jour et côte basque"},
        defaults=dict(
            title="Paris en 1 jour et côte basque",
            description="Incontournables de Paris sur une journée.",
            days=1,
            mobility="metro",
            season="été",
            audience="famille",
            owner=owner,
            location="Paris",
            city="Paris",
            category="citytrip",
            price=0,
        )
    )
    create_activity(
        g2,
        title="Tour Eiffel",
        description="Montée au 2e étage et photos",
        category="visite",
        day=1, order=1,
        address="Champ de Mars, 5 Av. Anatole France, 75007 Paris",
        hours="09:30 - 11:30",
        website="https://www.toureiffel.paris/",
        phone="+33144112323",
    )
    create_activity(
        g2,
        title="Déjeuner bistrot",
        description="Cuisine française, réservation conseillée",
        category="restaurant",
        day=1, order=2,
        location="7e arrondissement",
        hours="12:30 - 13:30",
    )
    create_activity(
        g2,
        title="Louvre",
        description="Aile Denon et Galerie d'Apollon",
        category="musee",
        day=1, order=3,
        address="Rue de Rivoli, 75001 Paris",
        hours="14:30 - 17:30",
        website="https://www.louvre.fr/",
    )

    print("[seed] Guides/activités/invitations injectés.")

def main():
    upsert_superuser()
    upsert_demo_user()
    normalize_categories()
    seed()

main()
PY
else
  echo "[entrypoint] SEED_ENABLED=0 — seed désactivé."
fi

# Lancement serveur
echo "[entrypoint] Lancement gunicorn…"
exec python -m gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers 3
