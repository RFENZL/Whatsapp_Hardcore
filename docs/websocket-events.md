# WebSockets / Socket.io – Événements

Le serveur Socket.io gère les événements temps réel suivants (selon le code et le cahier des charges) :

## Côté client → serveur

- `message:send` : envoi d'un nouveau message
- `message:edit` : édition d'un message
- `message:delete` : suppression d'un message
- `message:read` : marquer un message comme lu
- `typing:start` : début de saisie dans une conversation
- `typing:stop` : fin de saisie
- `presence:update` : mise à jour de la présence
- `conversation:join` : rejoindre une room de conversation
- `conversation:leave` : quitter une room de conversation

## Côté serveur → client

- `message:new` : nouveau message reçu
- `message:updated` : message édité
- `message:deleted` : message supprimé
- `message:status` : mise à jour d'état (sent / delivered / read)
- `conversation:updated` : mise à jour métadonnées conversation
- `notification:new` : nouvelle notification
- `presence:online` / `presence:offline` : statut en ligne / hors ligne d'un utilisateur
- `typing:start` / `typing:stop` : indicateur de saisie

L'app frontend s'abonne à ces événements via `socket.on(...)` dans `src/lib/socket.js` et met à jour le store / l'UI en conséquence.
