# HWS — Test technique (Angular + Django + PostgreSQL)

Application web scindée en deux exercices (front Angular et back Django) avec une base PostgreSQL. Le projet est prêt à être démarré en local via Docker, avec un jeu de données de démonstration injecté automatiquement au premier lancement.

## Sommaire
- [HWS — Test technique (Angular + Django + PostgreSQL)](#hws--test-technique-angular--django--postgresql)
  - [Sommaire](#sommaire)
  - [Contexte et choix des technologies](#contexte-et-choix-des-technologies)
  - [Prérequis](#prérequis)
  - [Démarrage rapide (Docker)](#démarrage-rapide-docker)
  - [Pour arrêter:](#pour-arrêter)
  - [Seed de données (auto)](#seed-de-données-auto)
  - [Comptes de test](#comptes-de-test)
  - [URLs et ports](#urls-et-ports)
  - [Collection Postman](#collection-postman)
  - [Commandes utiles](#commandes-utiles)
  - [Résolution de problèmes](#résolution-de-problèmes)
  - [Ce qui est livré / Ce qui manque](#ce-qui-est-livré--ce-qui-manque)

---
## Contexte et choix des technologies

Pour ce test technique, nous avons choisi une stack technologique moderne et robuste qui permet de couvrir l'ensemble des besoins du projet tout en assurant une bonne maintenabilité et évolutivité.

### Frontend : Angular
- **Pourquoi Angular ?**
  - Framework mature et bien documenté avec une forte communauté
  - Architecture modulaire et scalable
  - Typage fort avec TypeScript pour une meilleure maintenabilité
  - Outils de développement intégrés (CLI, DevTools)
  - Bonne intégration avec les API REST

- **Version utilisée :**
  - Angular 20.2.4
  - TypeScript 5.9.2
  - Node.js 22.19.0
  - npm 10.9.3

### Backend : Django
- **Pourquoi Django ?**
  - Framework Python rapide et sécurisé
  - Architecture "batteries included" avec de nombreuses fonctionnalités intégrées
  - ORM puissant pour l'interaction avec la base de données
  - Sécurité renforcée (protection contre les CSRF, XSS, SQL injection)
  - Bonne documentation et communauté active

### Base de données : PostgreSQL
- **Pourquoi PostgreSQL ?**
  - SGBD relationnel open-source robuste et performant
  - Support des transactions ACID
  - Fonctionnalités avancées (indexation, vues matérialisées, etc.)
  - Bonne intégration avec Django via l'ORM
  - Scalabilité et fiabilité pour les applications professionnelles

---

## Prérequis

- Docker Desktop installé (Windows/macOS/Linux)
- Git
- Ports libres:
  - 4200 (Frontend Angular)
  - 8000 (API Django)
  - 5432 (PostgreSQL)

- Sur Windows, Docker Desktop est requis.

---
## Démarrage rapide (Docker)

1) Ouvre un terminal, place-toi à la racine du projet:
   cd HWS

2) Lance tout le projet en détaché (build + démarrage):
    docker compose up -d --build


3) Attends ~30–60 secondes:
- la base de données démarre,
- Django applique les migrations,
- un seed de données injecte des comptes, guides, activités, invitations.

4) Accès:
- Frontend: http://localhost:4200/
- API http://localhost:8000/

## Pour arrêter:
Pour repartir d’un environnement propre (réinitialise aussi les volumes):
docker compose down -v
docker compose up -d --build


---

## Seed de données (auto)

Au premier lancement (ou si SEED_RESET/SEED_FORCE est utilisé), l’entrypoint:
- applique les migrations,
- crée un superuser + un utilisateur de démo,
- crée 2 guides d’exemple (Bordeaux, Paris),
- insère plusieurs activités par guide,
- crée une invitation liée à l’utilisateur de démo (si le champ invited_user existe dans ton modèle, la liaison est faite; sinon fallback via invited_email).

Le seed est idempotent: il utilise des “upsert” pour éviter les doublons.

---

## Comptes de test

- Administrateur:
  - identifiant: admin
  - email: admin@example.com
  - mot de passe: admin

- Utilisateur de démo:
  - identifiant: demouser
  - email: demo@example.com
  - mot de passe: demo

Ces identifiants sont pensés pour le local uniquement.

---

## URLs et ports

- Frontend Angular: http://localhost:4200/
- API Django: http://localhost:8000/

L’API renvoie les guides avec leurs activités, et les invitations incluent un objet `invited_user` minimal afin que le front affiche correctement “Utilisateur invité”.

---

## Collection Postman

Deux fichiers sont fournis à la racine:
- `HWS.postman_collection.json` (Collection)
- `Env HWS.postman_environment.json` (Environnement)

Procédure:
1) Ouvrir Postman.
2) Importer la collection et l’environnement.
3) Sélectionner l’environnement “Env HWS”.
4) Lancer les requêtes (authent, CRUD Users/Guides/Invitations/Activities…).

Remarque: La collection couvre l’essentiel de l’API, certaines routes optionnelles peuvent manquer car non développées intégralement.

---

## Commandes utiles

Logs en direct :
`docker compose logs -f`
`docker compose logs -f backend`
`docker compose logs -f frontend`
`docker compose logs -f db`

Rebuild ciblé :
`docker compose up -d --build backend`
`docker compose up -d --build frontend`


Réinitialiser la base et reseed :
`docker compose down -v`
`SEED_RESET=1 docker compose up -d --build`


Créer un superuser manuellement (rarement nécessaire grâce au seed) :
`docker compose exec backend python manage.py createsuperuser`

---

## Résolution de problèmes

- Port déjà utilisé (4200/8000/5432):
  - Fermer l’application qui occupe le port ou changer les ports exposés dans `docker-compose.yml`.

- Le seed ne s’exécute pas:
  - Vérifier `SEED_ENABLED=1` (par défaut à 1).
  - Consulter les logs `docker compose logs -f backend`.

- Sous Windows:
  - Utiliser Docker Desktop avec WSL2 activé.
  - Éviter les chemins avec espaces et les droits restreints.

---

## Ce qui est livré / Ce qui manque

- Livré:
  - Conteneurs Docker pour frontend, backend, base de données.
  - Seed de données robuste (idempotent, réinitialisable).
  - Auth de base, gestion utilisateurs (admin/user), guides, activités, invitations côté API.
  - Ecrans front pour authentification, listing et détails de guides (incluant activités).

- Partiellement fait / non fait:
  - Certaines opérations avancées d’admin (selon consignes du test).
  - Tests unitaires/integ exhaustifs.
  - Sécurité/permissions fines à durcir pour un contexte prod.

---

