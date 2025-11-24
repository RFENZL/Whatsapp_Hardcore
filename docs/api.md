# Documentation API (REST & WebSocket)

Cette documentation est une vue d’ensemble, alignée avec la Section 15.3 du sujet.

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
