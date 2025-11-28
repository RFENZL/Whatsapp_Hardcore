# Frontend – Fonctionnement détaillé

Le frontend est une application **Vue 3** construite avec **Vite**.

## Structure

- `src/main.js` : création de l'app Vue
- `src/App.vue` : composant racine
- `src/router/index.js` : routes
- `src/components/` : composants UI
- `src/views/` : pages principales (Chat, Login, ForgotPassword, ResetPassword)
- `src/lib/api.js` : wrapper HTTP (axios ou fetch)
- `src/lib/socket.js` : gestion du client Socket.io
- `src/lib/storage.js` : gestion du stockage local (localStorage / sessionStorage)
- `src/utils/validation.js` : helpers de validation

## Routes

À partir de `src/router/index.js` :

- `/` → `Chat.vue` (protégé par `meta.requiresAuth = true`)
- `/login` → `Login.vue`
- `/forgot-password` → `ForgotPassword.vue`
- `/reset-password` → `ResetPassword.vue`

Un guard global (router.beforeEach) est utilisé pour :

- rediriger vers `/login` si la route requiert l'authentification et que l'utilisateur n'est pas connecté
- empêcher d'aller sur `/login` si déjà authentifié (optionnel selon l'implémentation exacte)

## Composants principaux

- `Sidebar.vue` : liste des conversations, recherche, filtres
- `ChatPane.vue` : affichage des messages
- `Composer.vue` : zone de saisie, emoji picker, upload fichier
- `Settings.vue` : paramètres utilisateur
- `Avatar.vue` : affichage avatar utilisateur
- `CameraModal.vue` : prise de photo / caméra
- `Toast.vue` : système de notifications visuelles

## Connexion à l'API

Le module `src/lib/api.js` fournit des fonctions pour appeler l'API REST :

- login / register
- list / search users
- list / create conversations
- send messages
- upload media
- gérer les contacts et groupes

Les tokens JWT sont généralement stockés via `storage.js` et ajoutés en header Authorization.

## Socket.io

Le module `src/lib/socket.js` :

- ouvre une connexion Socket.io au backend
- transmet le token d'authentification
- écoute les événements :
  - `message:new`
  - `message:updated`
  - `conversation:updated`
  - `presence:online/offline`
  - `typing:start/stop`
- expose une API pour :
  - émettre des messages
  - signaler la saisie
  - mettre à jour les statuts de lecture

