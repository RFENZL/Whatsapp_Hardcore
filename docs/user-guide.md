# Guide utilisateur

## Installation rapide (local)

1. Lancer MongoDB (en local ou via Docker).
2. Backend :
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run dev
   ```
3. Frontend :
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```

## Flux de base

1. **Inscription**
   - Ouvrir l’URL du frontend.
   - Cliquer sur l’onglet *Inscription*.
   - Saisir email, nom d’utilisateur, mot de passe.
   - Valider : vous êtes automatiquement connecté.

2. **Connexion**
   - Ouvrir l’onglet *Connexion*.
   - Entrer email + mot de passe.

3. **Démarrer une conversation**
   - Utiliser la barre de recherche dans la sidebar pour trouver un utilisateur.
   - Cliquer sur l’utilisateur pour ouvrir une conversation.
   - Saisir un message dans la zone de texte en bas et envoyer.

4. **Lire les statuts**
   - Les avatars affichent un indicateur vert si l’utilisateur est en ligne.
   - Sous le nom, vous pouvez voir s’il est *online* ou quand il a été vu pour la dernière fois.

5. **Actions sur les messages**
   - L’UI permet déjà d’afficher les messages, l’historique et les statuts envoyés/lu.
   - Les fonctionnalités avancées (édition, suppression, épinglage, partage de fichiers) peuvent être activées à partir du backend existant.
