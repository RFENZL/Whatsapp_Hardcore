# Architecture & Planning – WhatsApp-like Clone (MEVN)

Ce projet est une application de messagerie instantanée temps réel basée sur la stack **MEVN** :

- **MongoDB** : base de données principale pour les utilisateurs et les messages.
- **Express / Node.js** : API REST, logique métier, WebSocket server.
- **Vue 3** : SPA côté client, gestion de l’interface et de l’état (composition API + stores simples).
- **Socket.io** : communication temps réel (statuts, messages, typing).

## Architecture générale

- `backend/`
  - `src/app.js` : configuration Express, middlewares, routes, exposition du frontend en production.
  - `src/server.js` : bootstrap Node, connexion MongoDB, création du serveur HTTP + Socket.io.
  - `src/models/*.js` : schémas Mongoose (`User`, `Message`).
  - `src/controllers/*.js` : logique de haut niveau (auth, users, messages).
  - `src/routes/*.js` : routes Express (`/api/auth`, `/api/users`, `/api/messages`).
  - `src/middleware/auth.js` : vérification JWT.
  - `src/socket/handlers.js` : logique temps réel (connexion, envoi de message, statut en ligne, typing).
  - `test/*.test.js` : tests d’intégration Mocha/Chai/Jest-like, dont WebSocket, auth, messages.

- `frontend/`
  - `src/main.js` : bootstrap Vue 3.
  - `src/App.vue` : page principale (auth + layout de chat).
  - `src/components/Sidebar.vue` : liste de conversations + recherche.
  - `src/components/ChatPane.vue` : affichage des messages et entête de conversation.
  - `src/components/Composer.vue` : zone de saisie (texte + envoi).
  - `src/components/Avatar.vue`, `src/components/MessageBubble.vue` : composants UI.
  - `src/lib/api.js` : wrapper HTTP pour parler à l’API REST.
  - `src/lib/socket.js` : initialisation du client Socket.io.
  - `src/lib/storage.js` : gestion du token JWT côté client (localStorage).

## Rôle des WebSockets & pattern de communication

- Authentification WebSocket : le client envoie son token JWT (`socket.handshake.auth.token`), vérifié par le serveur.
- Chaque connexion est associée à un utilisateur, stockée dans `onlineUsers`.
- Les événements Socket.io implémentés :
  - `send-message` : envoi d’un message ; le backend persiste le message et l’émet aux clients concernés.
  - `typing` / `typing-stopped` : indicateur de saisie.
  - `user-status`, `user-online`, `user-offline` : présence en ligne / hors-ligne.
- En cas de reconnexion, le client récupère l’historique via l’API REST (`/api/messages/conversation`) puis reprend la socket.

### Flux de données

1. **Inscription / connexion**
   - Le client appelle `/api/auth/register` ou `/api/auth/login`.
   - Le backend crée / vérifie l’utilisateur, renvoie un JWT.
   - Le frontend stocke le JWT dans `localStorage` et l’utilise pour toutes les requêtes + WebSocket.

2. **Chargement initial**
   - Récupération de l’utilisateur courant (`/api/users` via `api.me()`).
   - Liste des conversations via `/api/messages/conversations`.
   - Connexion Socket.io avec `auth.token`.

3. **Envoi d’un message**
   - Frontend : POST `/api/messages` (pour fiabilité) **et** émission `send-message` via Socket.io avec un `clientId`.
   - Backend : enregistre le message en base, répond au POST, et confirme côté WebSocket en renvoyant le message complet.
   - Frontend : met à jour la UI en temps réel, gère le statut (`sent` / `received` / `read`).

4. **Gestion de la présence**
   - À la connexion : mise à jour du status `online` + `lastSeen` dans `User`.
   - À la déconnexion (toutes les sockets fermées) : `offline` + mise à jour de `lastSeen` + broadcast à tous les clients.

## Points de défaillance & stratégies

- **MongoDB indisponible** : l’API retourne une erreur 500 ; il faut prévoir des retries au niveau opérationnel (non géré par le code applicatif).
- **Perte de connexion WebSocket** : le client Socket.io gère la reconnexion automatique (backoff exponentiel). Les messages manqués sont récupérés via les endpoints REST.
- **JWT expiré / invalide** : l’API renvoie 401, le frontend déconnecte l’utilisateur et le renvoie sur l’écran d’authentification.
- **Charge élevée** :
  - Index sur les collections (`MessageSchema.index({ sender, recipient, createdAt })`).
  - Pagination pour l’historique des messages.
  - Socket.io pouvant être scalé avec un adaptateur Redis (prévu par le design, non activé par défaut).

Cette architecture est alignée avec la **Section 1** du PDF (architecture client-serveur, WebSockets, rooms/sessions, cache local via le store frontend, reconnexion, scalabilité de base).
