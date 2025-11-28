# Backend – Fonctionnement détaillé

Le backend est une API REST construite avec **Express.js** et **MongoDB** (via Mongoose), complétée par un serveur **Socket.io** pour le temps réel.

## Démarrage

- Script : `npm run dev` (dev) ou `npm start` (production)
- Entrée : `src/server.js`
  - charge la configuration
  - initialise la connexion MongoDB
  - crée l'app Express (`require('./app')`)
  - attache Socket.io au serveur HTTP
  - lance l'écoute sur le port configuré

## App Express (`src/app.js`)

Responsabilités principales :

- configuration CORS
- parsing JSON / URL-encoded
- logging des requêtes
- configuration des routes : 
  - `/api/auth`
  - `/api/users`
  - `/api/contacts`
  - `/api/conversations`
  - `/api/messages`
  - `/api/groups`
  - `/api/notifications`
  - `/api/reactions`
  - `/api/upload`
  - `/api/images`
- gestion des erreurs (middleware global)

## Authentification (`auth`)

- Authentification par **JWT**
- Middleware `src/middleware/auth.js` :
  - lit le header `Authorization: Bearer <token>`
  - vérifie le token
  - attache l'utilisateur courant à `req.user`
- Routes auth :
  - `POST /api/auth/register` : inscription
  - `POST /api/auth/login` : connexion
  - `POST /api/auth/logout` : déconnexion
  - `POST /api/auth/refresh` ou équivalent (selon ce qui est implémenté)
  - `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` si présents

## Utilisateurs (`users`)

- Récupération et mise à jour du profil
- Gestion des sessions actives (multidevice)
- Mise à jour de l'avatar, du statut, du pseudo
- Suppression de compte

Exemples d'actions typiques :

- `GET /api/users/me` : récupérer le profil courant
- `PUT /api/users/profile` : mettre à jour le profil
- `GET /api/users/sessions` : lister les sessions connectées
- `DELETE /api/users/sessions/:sessionId` : déconnecter une session

## Contacts (`contacts`)

- Ajout / suppression de contacts
- Recherche de contacts
- Blocage / déblocage

## Conversations & Messages

- `conversations` :
  - création de conversation 1-to-1 ou groupe
  - listing des conversations d'un utilisateur
  - récupération des métadonnées (dernier message, unread count, etc.)

- `messages` :
  - envoi de message dans une conversation
  - édition / suppression
  - support des types texte / média
  - états de message (pending / sent / delivered / read)

## Groupes (`groups`)

- Création de groupes
- Ajout / retrait de membres
- Rôles : creator, admin, moderator, member
- Mise à jour du titre, de la description, de la photo de groupe

## Notifications & Réactions

- `notifications` : stockage des notifications système (nouveau message, ajout à un groupe, etc.)
- `reactions` : réactions emoji aux messages (stockées dans le modèle Reaction / Message)

