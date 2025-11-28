# Tests

Le projet comporte une stratégie de tests sur :

## Backend

- Framework : **Mocha** + **Chai**
- Commande : `npm test` dans `backend/`
- Fichiers de test : `backend/test/**/*.test.js`
- Types de tests :
  - tests unitaires sur les controllers et services
  - tests d'intégration sur les routes API
  - tests de WebSocket possibles via un client Socket.io de test
- Couverture mesurée via `nyc` avec configuration dans `.nycrc.json`

## Frontend

- Framework : **Vitest**
- Commandes :
  - `npm test` / `npm run test` dans `frontend/`
  - `npm run test:coverage` pour la couverture
- Emplacement : `frontend/src/__tests__`
- Types de tests :
  - tests de composants Vue
  - tests de logique utilitaire
  - éventuels tests de store / routing

Objectif de couverture (selon le cahier des charges) : **≥ 70%** sur backend et frontend.
