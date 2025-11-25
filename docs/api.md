# Documentation API (REST & WebSocket)

## Authentification

### POST `/api/auth/register`

Crée un nouvel utilisateur.

- Body : `{ email, username, password, avatar? }`
- Réponse : `{ token, user }`

### POST `/api/auth/login`

Connecte un utilisateur existant.

- Body : `{ email, password }`
- Réponse : `{ token, user }`

### POST `/api/auth/logout`

Invalide la session côté client (le backend ne gère pas encore de liste de tokens invalidés, mais ce point est documenté pour extension).

---

## Utilisateurs

Toutes ces routes nécessitent un header : `Authorization: Bearer <jwt>`.

### GET `/api/users`

Liste de tous les utilisateurs (hors mot de passe).

### GET `/api/users/:id`

Détails d’un utilisateur.

### PUT `/api/users/profile`

Met à jour le profil de l’utilisateur courant.

- Body possible : `{ username?, avatar? }` (extensions possibles : statut, bio, etc.)

### GET `/api/users/search?query=...`

Recherche d’utilisateurs par `username` (utilisé côté frontend pour démarrer des conversations).

---

## Messages

### GET `/api/messages/search/advanced?q=...&type=...&startDate=...&endDate=...`

Recherche avancée de messages avec filtres multiples :
- `q` : recherche textuelle (utilise l'index MongoDB)
- `type` : filtrer par type (text, image, video, audio, file, system)
- `startDate`, `endDate` : filtrer par plage de dates (format ISO)
- `conversationId` : filtrer par conversation
- `senderId` : filtrer par expéditeur
- `page`, `limit` : pagination

### POST `/api/messages/:id/pin`

Épingle un message dans un groupe (admin seulement).

### DELETE `/api/messages/:id/pin`

Désépingle un message dans un groupe (admin seulement).

### GET `/api/messages/conversation/:conversationId/pinned`

Liste les messages épinglés d'une conversation.

### POST `/api/messages`

Envoie un nouveau message (direct ou de groupe).

- Body : `{ recipient_id?, conversation_id?, content, type?, media_id?, replyTo?, mentions?, expiresAt? }`
- Le message commence avec le statut 'pending', puis passe à 'sent' après création
- statusTimestamps contient les timestamps pour chaque état (pending, sent, delivered, read)
- `expiresAt` (optionnel) : date d'expiration pour les messages éphémères

### GET `/api/messages/search?q=...&conversationId=...&page=...&limit=...`

Recherche de messages par contenu textuel.
- Utilise l'index texte MongoDB pour une recherche performante
- Les résultats sont triés par pertinence puis par date
- Paramètres :
  - `q` (requis) : terme de recherche
  - `conversationId` (optionnel) : filtrer par conversation
  - `senderId` (optionnel) : filtrer par expéditeur
  - `page`, `limit` : pagination

### POST `/api/messages`

Crée un nouveau message.

- Body : `{ recipient_id, content, clientId? }`
- Réponse : le message complet (avec `_id`, `createdAt`, etc.).

### GET `/api/messages/conversation/:otherId?page=&limit=`

Retourne les messages d’une conversation one-to-one avec un autre utilisateur.

### GET `/api/messages/conversations`

Retourne la liste des conversations de l’utilisateur courant avec :

- `otherUser` : infos de l’autre utilisateur.
- `lastMessage` : dernier message de la conversation.
- `unread` : nombre de messages non lus.

### PUT `/api/messages/:id`

Met à jour un message (édition du contenu).

### DELETE `/api/messages/:id`

Suppression logique (soft delete) d’un message.

### POST `/api/messages/:id/read`

Marque un message comme lu.

*(Extensions prévues : recherche par texte, filtres date/expéditeur, messages épinglés, messages temporaires, etc.)*

---

## Médias

### POST `/api/medias/upload`

Upload d'un fichier média avec traitement automatique :
- **Images** : compression automatique avec sharp (qualité 85%)
- **Miniatures** : génération automatique pour images (200x200px)
- **Déduplication** : vérifie le hash du fichier pour éviter les doublons
- Types supportés : images, vidéos, audio, documents
- Tailles maximales :
  - Images : 10 MB
  - Vidéos : 100 MB
  - Audio : 20 MB
  - Documents : 50 MB

- Body (form-data) : `file` + `conversation_id?`
- Réponse : objet Media avec `url`, `thumbnail`, `dimensions`, etc.

### GET `/api/medias/conversation/:conversationId?type=&page=&limit=`

Liste les médias d'une conversation avec pagination et filtrage par type.

### GET `/api/medias/:id`

Obtient les détails d'un média spécifique.

### DELETE `/api/medias/:id`

Suppression (soft delete) d'un média. Seul l'uploader peut supprimer.

### GET `/api/medias/stats`

Statistiques des médias de l'utilisateur (nombre et taille par type).

### GET `/api/medias/:id/stream`

Streaming d'un fichier média avec support du range header.
- Idéal pour les vidéos et gros fichiers
- Support de la lecture progressive
- Headers: `Range: bytes=start-end`

---

## Groupes

### POST `/api/groups`

Crée un nouveau groupe.
- Body : `{ name, description?, avatar?, memberIds }`

### GET `/api/groups/:id`

Obtient les détails d'un groupe.

### PUT `/api/groups/:id`

Met à jour les informations du groupe (admin seulement).

### POST `/api/groups/:id/members`

Ajoute des membres au groupe.

### DELETE `/api/groups/:id/members/:memberId`

Retire un membre du groupe (admin seulement).

### POST `/api/groups/:id/leave`

Quitte le groupe.

### POST `/api/groups/:id/members/:memberId/promote`

Promeut un membre en administrateur (admin seulement).

### PUT `/api/groups/:id/settings`

Met à jour les paramètres du groupe (admin seulement).

### POST `/api/groups/:id/invite`

Génère un lien d'invitation pour rejoindre le groupe (admin seulement).
- Body : `{ maxUses?, expiresInDays? }`
- Retourne : `{ inviteLink, code, expiresAt, maxUses }`

### POST `/api/groups/join/:code`

Rejoint un groupe via un code d'invitation.

### DELETE `/api/groups/:id/invite`

Désactive le lien d'invitation du groupe (admin seulement).

### POST `/api/groups/:id/ban`

Bannit un membre du groupe (admin seulement).
- Body : `{ userId, reason? }`
- Le membre banni ne pourra plus rejoindre le groupe

### POST `/api/groups/:id/unban`

Débannit un membre (admin seulement).
- Body : `{ userId }`

### GET `/api/groups/:id/history`

Obtient l'historique des membres du groupe (ajouts, départs, bannissements).

### GET `/api/groups/:id/banned`

Liste les membres bannis du groupe (admin seulement).

---

## Jobs automatiques

### Nettoyage des messages expirés

Un job s'exécute automatiquement toutes les heures pour supprimer les messages éphémères dont la date d'expiration est dépassée.
- Les messages avec `expiresAt` défini sont automatiquement marqués comme supprimés
- Le contenu est remplacé par "[Message expiré]"

---

## Conversations

### POST `/api/conversations/direct`

Crée une conversation directe (1-1).
- Body : `{ participantId }`

### GET `/api/conversations`

Liste les conversations de l'utilisateur avec tri automatique :
- Les conversations épinglées apparaissent en premier
- Puis triées par date du dernier message
- Retourne : `isPinned`, `isArchived`, `isMuted`, `unreadCount`

### GET `/api/conversations/:id`

Détails d'une conversation spécifique.

### POST `/api/conversations/:id/archive`

Archive une conversation.

### POST `/api/conversations/:id/unarchive`

Désarchive une conversation.

### POST `/api/conversations/:id/pin`

Épingle une conversation (apparaîtra en haut de la liste).

### POST `/api/conversations/:id/unpin`

Désépingle une conversation.

### POST `/api/conversations/:id/toggle-mute`

Active/désactive le mode silencieux pour une conversation.

### POST `/api/conversations/:id/mark-read`

Marque tous les messages d'une conversation comme lus.

### DELETE `/api/conversations/:id`

Supprime une conversation (pour l'utilisateur uniquement).

---

## Événements WebSocket (Socket.io)

### Connexion

Le client se connecte avec :

```js
io(url, {
  auth: { token: '<jwt>' }
});
```

Si le token est invalide, la connexion est refusée.

### `send-message`

Payload : `{ to, content }`

Réponse : message complet (via callback et broadcast aux clients concernés).

### `typing`

Payload : `{ to }`  
Effet : émet `typing` puis `typing-stopped` côté destinataire après un timeout.

### `user-status`, `user-online`, `user-offline`

Événements broadcast informant des changements de présence.
