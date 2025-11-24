# Stratégie de tests

Le backend inclut déjà une suite de tests Mocha/Chai et une configuration de couverture **nyc**.

## Types de tests présents

- **Tests d’API REST** :
  - Authentification (inscription, connexion).
  - CRUD de base sur les utilisateurs.
  - Création et récupération de messages.
  - Agrégations pour la liste des conversations.

- **Tests WebSocket** :
  - Connexion avec JWT.
  - Envoi de messages via `send-message`.
  - Réception temps réel chez le destinataire.

- **Tests base de données** :
  - Utilisation de `mongodb-memory-server` pour isoler les tests.

La commande :

```bash
cd backend
npm run coverage
```

génère un rapport de couverture (`backend/coverage/`), dont l’objectif est de rester **≥ 70%** comme demandé dans le sujet.

## Scénarios recommandés (TODO)

Pour se rapprocher totalement du PDF, il est conseillé d’ajouter (ou de compléter) des tests pour :

- Messages modifiés / supprimés.
- Statuts de messages (`sent`, `received`, `read`).
- Gestion des erreurs (permissions, 401/403, entrées invalides).
- Cas de charge (beaucoup de messages, plusieurs utilisateurs).
- Sécurité basique :
  - Requêtes sans JWT.
  - Requêtes avec JWT invalide.
  - Validation d’entrée sur les endpoints d’authentification.
