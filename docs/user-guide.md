# Guide utilisateur

## Installation (mode simple développeur)

1. Cloner le dépôt
2. Lancer MongoDB (via Docker ou localement)
3. Dans `backend/` :
   - copier `.env.example` vers `.env`
   - ajuster les variables (URL Mongo, JWT secret, etc.)
   - `npm install`
   - `npm run dev`
4. Dans `frontend/` :
   - copier `config.production.json` si nécessaire
   - `npm install`
   - `npm run dev`

## Utilisation

- Ouvrir le frontend (par défaut sur http://localhost:5173 ou 3000 selon config)
- Créer un compte (page d'inscription)
- Se connecter
- Ajouter des contacts
- Créer une conversation ou un groupe
- Envoyer des messages texte et média
- Voir les états des messages (envoyé, livré, lu)
- Gérer son profil (avatar, statut)
- Paramétrer ses notifications (si interface fournie)

