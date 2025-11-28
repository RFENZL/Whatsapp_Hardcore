# Architecture générale

## Vue d'ensemble

L'application est structurée en deux parties principales :

- `/backend` : API REST + serveur Socket.io + accès base MongoDB
- `/frontend` : SPA Vue 3 qui consomme l'API REST et communique en temps réel via Socket.io

Un fichier `docker-compose.yml` orchestre les services :

- `backend` (Node + Express + Socket.io)
- `frontend` (Vite / Nginx selon la config finale)
- `mongodb`
- éventuellement un service `mongo-express` ou équivalent selon la config

## Backend

Le backend est dans le dossier `backend/` :

- `src/server.js` : point d'entrée, création du serveur HTTP + initialisation Socket.io
- `src/app.js` : configuration de l'application Express (middlewares, routes, erreurs)
- `src/routes/*.js` : déclarations des routes REST
- `src/controllers/*.js` : logique métier pour chaque ressource
- `src/models/*.js` : schémas Mongoose pour MongoDB
- `src/middleware/auth.js` : middleware d'authentification JWT
- `src/jobs/cleanupExpiredMessages.js` : tâches planifiées (cron/job) pour nettoyage

Le backend expose des routes REST pour :

- l'authentification (`auth`)
- les utilisateurs (`users`)
- les contacts (`contacts`)
- les conversations et messages (`conversations`, `messages`)
- les groupes (`groups`)
- les médias (`media`, `images`, `upload`)
- les notifications et réactions (`notifications`, `reactions`)

## Frontend

Le frontend est dans le dossier `frontend/` :

- `src/main.js` : point d'entrée Vue, création de l'application et montage
- `src/App.vue` : composant racine
- `src/router/index.js` : configuration des routes Vue Router
- `src/components/*.vue` : composants réutilisables (Sidebar, ChatPane, Composer, etc.)
- `src/views/Chat.vue`, `Login.vue`, `ForgotPassword.vue`, `ResetPassword.vue` : pages vues
- `src/lib/api.js` : client HTTP pour consommer l'API REST
- `src/lib/socket.js` : gestion de la connexion Socket.io
- `src/lib/storage.js` : persistance locale (token, paramètres)
- `src/utils/validation.js` : validations côté client

Le routing frontal expose notamment :

- `/` : page principale de chat (protégée par `requiresAuth`)
- `/login` : page de connexion
- `/forgot-password` : page de récupération de mot de passe
- `/reset-password` : page de réinitialisation

## Communication temps réel

La communication temps réel se fait via **Socket.io** :

- côté backend : initialisation dans `src/server.js` + gestion des événements dans des modules dédiés
- côté frontend : utilisation de `src/lib/socket.js` / `socket-migration.js`

Les événements gèrent notamment :

- connexion / déconnexion d'un utilisateur
- envoi / réception de message
- états de message (envoyé, livré, lu)
- indicateur de saisie
- notifications (nouveau message, ajout à un groupe, etc.)

