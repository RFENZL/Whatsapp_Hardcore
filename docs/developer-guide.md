# Guide développeur

## Prérequis

- Node.js (version indiquée dans `package.json`)
- npm ou yarn
- Docker (optionnel mais recommandé)
- MongoDB (ou via Docker)

## Mise en place du backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Points importants :

- Configuration dans `.env` et `config.production.json`
- Les modèles sont dans `src/models/`
- Les routes sont dans `src/routes/`
- La logique métier est dans `src/controllers/`
- Le middleware d'auth est dans `src/middleware/auth.js`

## Mise en place du frontend

```bash
cd frontend
npm install
npm run dev
```

- Les pages sont dans `src/views/`
- Les composants réutilisables dans `src/components/`
- Le router dans `src/router/index.js`
- Les accès API dans `src/lib/api.js`
- La gestion Socket.io dans `src/lib/socket.js`

## Conventions

- Code JS : standard ES, linté par ESLint (voir config)
- Tests : Mocha côté backend, Vitest côté frontend
- Commits : idéalement structurés (feat, fix, chore, etc.)
