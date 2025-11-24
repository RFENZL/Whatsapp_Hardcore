# Documentation développeur

## Setup de développement

1. MongoDB :
   - Lancer un MongoDB local sur `mongodb://localhost:27017`.
   - Par défaut, la base utilisée est `tpchat`.

2. Backend :
   - Variables d’environnement principales :
     - `PORT` (par défaut 4000)
     - `MONGODB_URI`
     - `JWT_SECRET`
     - `CLIENT_ORIGIN`
     - `SENTRY_DSN` (optionnel, monitoring)
   - Commandes :
     - `npm run dev` : mode développement.
     - `npm test` : tests unitaires/intégration.
     - `npm run coverage` : rapport de couverture.

3. Frontend :
   - Variables d’environnement :
     - `VITE_API_URL` : URL du backend (ex : `http://localhost:4000`).
   - Commandes :
     - `npm run dev` : serveur Vite.
     - `npm run build` : build de production dans `frontend/dist`.

## Standards de code & patterns

- Backend :
  - Express + middleware composables (auth, validation).
  - Séparation `routes` / `controllers` / `models` / `middleware` / `socket`.
  - Mongoose pour les schémas de données, avec index pour les requêtes critiques.
  - JWT pour l’authentification stateless.

- Frontend :
  - Vue 3 Composition API.
  - Components découplés par responsabilité (Sidebar, ChatPane, Composer).
  - TailwindCSS pour le style.

## Monitoring & Sentry

Une intégration Sentry côté backend est prévue (voir `src/app.js`, section Sentry).  
Configurer `SENTRY_DSN` dans le `.env` de production pour envoyer les erreurs et traces.

## Roadmap technique (alignée sur le PDF)

- Ajout d’un modèle `Conversation` explicite + gestion des groupes.
- Gestion de contacts (blocage, liste de contacts, import).
- Partage de médias (images, vidéos, fichiers) avec stockage externe (S3, etc.).
- Notifications push (Service Worker / PWA).
- Mode hors ligne complet (cache local des messages + queue d’envoi).
- Analytics (events d’usage, performance).
