# WhatsApp-like Chat App – TP Final

Stack :
- Frontend : **Vue 3 + TailwindCSS + Vite**
- Backend : **Express + Socket.io + MongoDB + JWT**
- Monitoring : **Sentry** (intégration backend)
- Tests : **Mocha + Chai + nyc**, MongoDB en mémoire.

Ce projet couvre :
- Authentification (register/login, JWT, profil de base).
- Conversations one-to-one avec messages temps réel.
- Statut en ligne/hors ligne, last seen, typing.
- API REST complète pour les messages et utilisateurs.
- Documentation utilisateur / développeur / API (voir dossier `docs/`).
- Monitoring Sentry côté backend.

## Démarrage en développement

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

## Build du frontend et serveur de production

```bash
cd frontend
npm run build

cd ../backend
npm run serve:dist
```

Le backend servira le contenu statique du frontend depuis `frontend/dist`.

## Documentation

Toute la documentation demandée par le sujet est centralisée dans le dossier [`docs/`](./docs) :

- `architecture.md` : architecture client/serveur, WebSockets, flux de données, points de défaillance.
- `user-stories.md` : user stories principales.
- `data-models.md` : modèles de données (User, Message, pistes pour Conversation/Groupes).
- `api.md` : endpoints REST & événements WebSocket.
- `tests.md` : stratégie de tests et couverture.
- `user-guide.md` : guide utilisateur.
- `dev-guide.md` : guide développeur et roadmap technique pour étendre jusqu’à 100% du sujet (contacts, groupes, médias, etc.).

