# Tests E2E - Playwright

## Configuration

### Installation des browsers

```bash
cd frontend
npx playwright install
```

### Prérequis pour les tests

**IMPORTANT** : Les tests E2E nécessitent que le backend soit démarré.

#### Option 1 : Démarrer le backend manuellement (recommandé)

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Tests E2E
cd frontend
npm run test:e2e
```

#### Option 2 : Backend en production

```bash
cd backend
npm start
```

### Lancer les tests

```bash
# Tous les tests E2E
npm run test:e2e

# Avec l'interface UI
npm run test:e2e:ui

# Tests spécifiques
npx playwright test e2e/auth-simple.spec.js

# Mode debug
npx playwright test --debug

# Générer un rapport
npx playwright show-report
```

## Structure des tests

### Tests actuels

- `auth-simple.spec.js` - Tests d'authentification basiques
  - Affichage du formulaire
  - Changement d'onglet login/register
  - Inscription d'un nouvel utilisateur
  - Validation des erreurs
  - Connexion avec credentials existants

### Tests à ajouter

- `messaging.spec.js` - Tests de messagerie
  - Envoi de messages
  - Réception de messages
  - Messages en temps réel via WebSocket
  
- `file-sharing.spec.js` - Tests de partage de fichiers
  - Upload d'images
  - Upload de documents
  - Téléchargement de fichiers

- `groups.spec.js` - Tests de groupes
  - Création de groupe
  - Ajout/retrait de membres
  - Messages de groupe

## Problèmes connus

### Backend non démarré

**Erreur** : `ECONNREFUSED` sur `/api/auth/me`

**Solution** : Démarrer le backend avant les tests E2E

### Timeout des tests

**Erreur** : `Test timeout of 30000ms exceeded`

**Solution** : Timeout augmenté à 60s dans playwright.config.js

### Sélecteurs non trouvés

**Solution** : Les tests `auth-simple.spec.js` utilisent des sélecteurs robustes avec `:has-text()` et `[placeholder]`

## Configuration Playwright

### playwright.config.js

- **Timeout** : 60s par test
- **Browser** : Chromium (Chrome)
- **Screenshots** : Automatiques en cas d'échec
- **Videos** : Conservées uniquement en cas d'échec
- **Serveur web** : Démarre automatiquement le frontend (Vite)

### Variables d'environnement

- `CI=true` : Active les retries et workers pour CI/CD

## Debugging

### Playwright Inspector

```bash
npx playwright test --debug
```

### Traces

Les traces sont automatiquement capturées en cas d'échec.

```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

### Screenshots

Disponibles dans `test-results/` après échec.

## Bonnes pratiques

1. **Isolation** : Chaque test doit être indépendant
2. **Données uniques** : Utiliser `Date.now()` pour générer des données uniques
3. **Attentes explicites** : Utiliser `waitForTimeout` ou `waitForSelector`
4. **Backend requis** : Toujours vérifier que le backend tourne
5. **Nettoyage** : Les tests doivent nettoyer leurs données si possible
