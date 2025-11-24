# Modèles de données

## Utilisateurs (`User`)

Schéma MongoDB (simplifié) :

- `email` : String obligatoire, unique.
- `username` : String obligatoire, unique, min 3 caractères.
- `password` : hashé avec **bcrypt**, non renvoyé au client.
- `avatar` : URL ou base64 optionnel.
- `status` : `'online' | 'offline'`.
- `createdAt` : Date de création.
- `lastSeen` : dernière fois vu en ligne.

Extensions prévues par le sujet (non toutes implémentées) :

- `bio` / `about` : texte de statut utilisateur.
- `blockedUsers` : liste d’IDs d’utilisateurs bloqués.
- `devices` : suivi des sessions / appareils connectés.

## Messages (`Message`)

Schéma MongoDB actuel :

- `sender` : ObjectId vers `User` (expéditeur).
- `recipient` : ObjectId vers `User` (destinataire).
- `content` : String (max 5000).
- `createdAt` : Date, indexée.
- `status` : `'sent' | 'received' | 'read'`.
- `edited` : booléen (message modifié).
- `deleted` : booléen (suppression logique).

Extensions possibles alignées sur le sujet :

- `type` : `'text' | 'image' | 'video' | 'audio' | 'file'`.
- `mediaUrl` / `thumbnailUrl` : gestion des médias.
- `pinned` : booléen pour les messages épinglés.
- `expiresAt` : pour messages temporaires.
- `replyTo` : référence vers un autre message (citations).
- `reactions` : tableau `{ userId, emoji }`.

## Conversations (virtuel)

Dans l’implémentation actuelle, la notion de conversation one-to-one est calculée côté backend par agrégation MongoDB :

```js
Message.aggregate([
  { $match: { $or: [ { sender: userId }, { recipient: userId } ] } },
  { $sort: { createdAt: -1 } },
  { $group: { ... } },
  ...
])
```

Pour correspondre totalement au PDF, un schéma explicite `Conversation` pourrait contenir :

- `participants` : liste d’utilisateurs.
- `type` : `'direct' | 'group'`.
- `title` / `photo` : pour les groupes.
- `settings` : préférences de notification, archivage, etc.
- `unreadCount` par utilisateur.

## Groupes

Non implémentés dans ce socle, mais prévus par le sujet. Un modèle `Group` / `Conversation` pourrait inclure :

- `name`, `description`, `photo`.
- `members` : `{ userId, role: 'owner' | 'admin' | 'moderator' | 'member' }`.
- Historique des modifications, audit, etc.
