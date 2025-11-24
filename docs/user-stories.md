# User Stories principales

Les user stories suivantes reprennent les grandes fonctionnalités listées dans le sujet, adaptées à l’implémentation actuelle du projet.

## Authentification

- En tant qu’utilisateur, je peux créer un compte avec email, nom d’utilisateur et mot de passe afin d’accéder à l’application.
- En tant qu’utilisateur, je peux me connecter avec mon email et mot de passe afin d’accéder à mes conversations.
- En tant qu’utilisateur, je veux rester connecté (token persisté) pour ne pas avoir à saisir mes identifiants à chaque fois.
- En tant qu’utilisateur, je veux pouvoir me déconnecter pour sécuriser mon compte.

## Gestion des contacts / utilisateurs

- En tant qu’utilisateur, je peux rechercher d’autres utilisateurs par nom d’utilisateur afin de démarrer une discussion.
- En tant qu’utilisateur, je peux voir la liste des autres utilisateurs avec leur statut en ligne / hors ligne.
- En tant qu’utilisateur, je peux voir le dernier statut en ligne (last seen) de mes contacts.

*(Fonctionnalités avancées du PDF comme blocage, liste de contacts dédiés, import, etc. peuvent être ajoutées par-dessus ce socle.)*

## Conversations & messages

- En tant qu’utilisateur, je peux voir la liste de mes conversations, triées par dernier message.
- En tant qu’utilisateur, je peux envoyer un message texte à un autre utilisateur connecté.
- En tant qu’utilisateur, je peux voir les messages dans une conversation, avec horodatage.
- En tant qu’utilisateur, je peux voir si mon message a été **envoyé**, **reçu** ou **lu**.
- En tant qu’utilisateur, je peux modifier ou supprimer mes propres messages (soft delete côté backend).
- En tant qu’utilisateur, je veux voir le nombre de messages non lus pour chaque conversation dans la sidebar.

## Temps réel & présence

- En tant qu’utilisateur, je veux voir si un contact est en ligne ou hors ligne.
- En tant qu’utilisateur, je veux voir quand mon contact est en train d’écrire dans la conversation.
- En tant qu’utilisateur, je veux que l’arrivée de nouveaux messages apparaisse en temps réel sans rafraîchir la page.

## Notifications & monitoring

- En tant qu’utilisateur, je veux être informé des erreurs critiques (ex : impossible d’envoyer un message) de manière claire.
- En tant qu’équipe de développement, nous voulons suivre les erreurs serveur et les problèmes de performance via Sentry (Section monitoring du PDF).

## Performances & sécurité

- En tant qu’utilisateur, je veux que les pages se chargent rapidement même en ayant beaucoup de messages.
- En tant qu’utilisateur, je veux que mes données soient protégées (HTTPS, JWT, validation des entrées côté backend).
