# Guide de Monitoring et Alertes

Ce document décrit le système complet de monitoring, logs et alertes mis en place dans l'application WhatsApp Hardcore.

## Table des matières

1. [Intégration Sentry](#1-intégration-sentry)
2. [Alertes de Sécurité](#2-alertes-de-sécurité)
3. [Système de Logs](#3-système-de-logs)
4. [Intégration Slack](#4-intégration-slack)
5. [Logs WebSocket](#5-logs-websocket)
6. [Configuration](#6-configuration)

---

## 1. Intégration Sentry

### Fonctionnalités implémentées

#### 1.1 Capture d'erreurs automatique
Toutes les erreurs non gérées sont automatiquement capturées et envoyées à Sentry avec leur stack trace complète.

#### 1.2 Breadcrumbs personnalisés
Des "breadcrumbs" (fils d'Ariane) sont ajoutés automatiquement pour tracer le parcours de l'utilisateur :
- Actions utilisateur (login, logout, modifications)
- Événements WebSocket (connexion, déconnexion, messages)
- Requêtes API importantes
- Modifications de données sensibles

#### 1.3 Context utilisateur
Chaque événement Sentry inclut :
- ID de l'utilisateur
- Username
- Email
- Informations de la requête (IP, User-Agent, etc.)

#### 1.4 Profiling des performances
- 10% des transactions sont profilées par défaut (configurable)
- Détection automatique des opérations lentes
- Métriques de latence et temps de réponse

### Configuration

```env
SENTRY_DSN=https://your-key@sentry.io/project-id
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

### Utilisation

```javascript
const Sentry = require('@sentry/node');

// Les erreurs sont automatiquement capturées
// Mais vous pouvez aussi capturer manuellement :
try {
  // code risqué
} catch (error) {
  Sentry.captureException(error, {
    tags: { operation: 'user-update' },
    user: { id: userId, username: username }
  });
}

// Ajouter un breadcrumb manuel
Sentry.addBreadcrumb({
  category: 'custom',
  message: 'Important action performed',
  level: 'info',
  data: { key: 'value' }
});
```

---

## 2. Alertes de Sécurité

### Types d'alertes implémentées

#### 2.1 Nouvelles connexions
- **Déclencheur** : Utilisateur se connecte
- **Alerte spéciale** : Connexion depuis une nouvelle localisation
- **Données** : Email, IP, localisation, user agent
- **Canal** : Logs + Slack (si nouvelle localisation)

#### 2.2 Modifications de profil
- **Déclencheur** : Changement de username, avatar, bio
- **Alerte spéciale** : Modifications de champs sensibles (email, username)
- **Données** : Champs modifiés (avant/après), IP
- **Canal** : Logs + Slack (si sensible)

#### 2.3 Modifications de paramètres de sécurité
- **Déclencheur** : 
  - Suppression de session
  - Suppression de toutes les sessions
- **Données** : Action effectuée, détails, IP
- **Canal** : Logs + Slack

#### 2.4 Ajout de contact
- **Déclencheur** : Nouvel ajout de contact
- **Données** : IDs et usernames des deux utilisateurs, IP
- **Canal** : Logs uniquement

#### 2.5 Blocage de contact
- **Déclencheur** : Blocage d'un utilisateur
- **Données** : IDs et usernames, IP
- **Canal** : Logs + Slack (indicateur potentiel de harcèlement)

#### 2.6 Suppression de compte
- **Déclencheur** : Utilisateur supprime son compte
- **Données** : User info, IP
- **Canal** : Logs + Slack

### Utilisation dans le code

```javascript
const { alertNewLogin, alertProfileModification } = require('../utils/securityAlerts');

// Dans un controller
await alertNewLogin({ 
  user, 
  session, 
  isNewLocation: true 
});

await alertProfileModification({ 
  user, 
  changes: { username: { old: 'john', new: 'john_doe' } },
  ipAddress: req.ip 
});
```

---

## 3. Système de Logs

### Niveaux de logs

1. **error** : Erreurs critiques
2. **warn** : Avertissements
3. **info** : Informations importantes
4. **http** : Requêtes HTTP
5. **debug** : Informations de débogage

### Types de logs spécialisés

#### 3.1 Logs de connexion
```javascript
logger.logLogin({
  userId: user._id,
  username: user.username,
  ipAddress: '192.168.1.1',
  location: { city: 'Paris', country: 'France' }
});
```

#### 3.2 Logs d'actions utilisateur
```javascript
logger.logUserAction('profile_update', {
  userId: user._id,
  changes: { username: 'new_name' },
  ipAddress: req.ip
});
```

#### 3.3 Logs d'erreurs enrichis
```javascript
logger.logError('Failed to update user', error, {
  userId: user._id,
  critical: true  // Déclenche une alerte Slack
});
```

#### 3.4 Logs de performance
```javascript
const start = Date.now();
// ... opération ...
const duration = Date.now() - start;
logger.logPerformance('database-query', duration, {
  query: 'findUsers',
  resultCount: 100
});
```

### Rotation des logs

- **Fréquence** : Quotidienne
- **Rétention** : 14 jours par défaut
- **Taille max** : 20 MB par fichier
- **Localisation** : `backend/logs/`

Fichiers générés :
- `combined-YYYY-MM-DD.log` : Tous les logs
- `error-YYYY-MM-DD.log` : Erreurs uniquement

---

## 4. Intégration Slack

### Configuration

1. Créer une application Slack sur https://api.slack.com/apps
2. Activer "Incoming Webhooks"
3. Créer un webhook pour votre canal
4. Copier l'URL dans `.env`

```env
SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Types de notifications

#### 4.1 Alertes de sécurité (Niveau : Critical)
- Nouvelles connexions depuis localisations inhabituelles
- Modifications de profil sensibles
- Modifications de paramètres de sécurité
- Suppressions de compte
- Tentatives de connexion échouées répétées (≥5)

#### 4.2 Alertes d'erreur (Niveau : Error)
- Erreurs serveur critiques
- Échecs de services externes
- Problèmes de base de données

#### 4.3 Avertissements (Niveau : Warning)
- Blocages de contacts
- Opérations lentes (>5s)
- Rate limiting dépassé

### Format des notifications

Chaque notification Slack inclut :
- **Emoji** : Selon le niveau (🔒 🚨 ⚠️ ℹ️)
- **Titre** : Description de l'alerte
- **Message** : Détails
- **Champs** : Données structurées (utilisateur, IP, timestamp, etc.)
- **Footer** : "WhatsApp Backend"

### Utilisation

```javascript
const { sendSecurityAlert, sendErrorAlert } = require('../utils/slackNotifier');

// Alerte de sécurité
await sendSecurityAlert({
  title: 'Tentative de connexion suspecte',
  message: 'Multiple failed login attempts detected',
  user: 'john@example.com',
  data: {
    'IP Address': '192.168.1.1',
    'Attempts': 10
  }
});

// Alerte d'erreur
await sendErrorAlert({
  title: 'Database connection failed',
  message: error.message,
  error: error,
  data: { database: 'mongodb', host: 'localhost' }
});
```

---

## 5. Logs WebSocket

### Événements loggés

#### 5.1 Connexions
- Connexion réussie
- Échec d'authentification
- Déconnexion (avec raison)

Données capturées :
- Socket ID
- User ID et username
- IP et User-Agent
- Timestamp

#### 5.2 Messages
Événements tracés :
- `message:send`
- `message:edit`
- `message:delete`
- `typing`
- `status:change`

Les données sensibles ne sont PAS loggées (contenu des messages), seulement :
- IDs (conversation, message, groupe)
- Types d'événements
- Métadonnées

#### 5.3 Erreurs WebSocket
Toutes les erreurs sont capturées avec :
- Context complet
- Stack trace
- Informations utilisateur
- Envoi automatique à Sentry

#### 5.4 Rate Limiting
Les dépassements de rate limit sont loggés avec :
- Socket ID
- User ID
- Événement concerné
- IP

### Utilisation dans le code

```javascript
const { 
  createEventLogger, 
  handleSocketError,
  trackDisconnection 
} = require('./middlewares');

// Créer le logger d'événements
const logEvent = createEventLogger({
  logAllEvents: false,
  eventsToLog: ['message:send', 'message:edit'],
  excludeEvents: ['heartbeat', 'ping']
});

// Logger un événement
socket.on('message:send', (data) => {
  logEvent(socket, 'message:send', data);
  // ... traitement ...
});

// Logger une erreur
socket.on('error', (error) => {
  handleSocketError(socket, error, {
    event: 'message:send',
    conversationId: data.conversationId
  });
});

// Logger une déconnexion
socket.on('disconnect', (reason) => {
  trackDisconnection(socket, reason);
});
```

---

## 6. Configuration

### Variables d'environnement requises

```env
# Sentry
SENTRY_DSN=                        # Obligatoire pour Sentry
SENTRY_TRACES_SAMPLE_RATE=0.1      # 0.0 à 1.0
SENTRY_PROFILES_SAMPLE_RATE=0.1    # 0.0 à 1.0

# Slack
SLACK_ENABLED=false                # true pour activer
SLACK_WEBHOOK_URL=                 # URL du webhook Slack

# Logs
LOG_LEVEL=info                     # error, warn, info, http, debug
LOG_RETENTION_DAYS=14              # Durée de conservation
LOG_MAX_SIZE=20                    # Taille max en MB

# Sécurité
MAX_LOGIN_ATTEMPTS=5               # Tentatives avant alerte
MAX_SESSIONS_PER_USER=5            # Sessions max par user
```

### Configuration en développement

```env
NODE_ENV=development
SENTRY_DSN=                        # Laisser vide ou mettre DSN de dev
SLACK_ENABLED=false                # Désactiver pour éviter le spam
LOG_LEVEL=debug                    # Plus verbeux
```

### Configuration en production

```env
NODE_ENV=production
SENTRY_DSN=https://...             # DSN de production
SLACK_ENABLED=true                 # Activer les alertes
SLACK_WEBHOOK_URL=https://...      # Webhook production
LOG_LEVEL=info                     # Moins verbeux
SENTRY_TRACES_SAMPLE_RATE=0.1      # 10% des traces
```

### Vérification de la configuration

Au démarrage du serveur, vérifiez les logs :
```
[INFO] Sentry initialized (environment: production)
[INFO] Slack notifications enabled
[INFO] Logger initialized with level: info
[INFO] Log rotation: 14 days, max 20MB per file
```

---

## 7. Bonnes pratiques

### 7.1 Logs
- ✅ Logger les actions importantes
- ✅ Inclure le contexte (user, IP, timestamp)
- ❌ Ne pas logger de données sensibles (mots de passe, tokens)
- ❌ Ne pas logger le contenu des messages utilisateurs

### 7.2 Alertes
- ✅ Configurer des alertes uniquement pour les événements critiques
- ✅ Inclure suffisamment de contexte pour diagnostiquer
- ❌ Ne pas spammer Slack avec trop d'alertes
- ❌ Ne pas envoyer de données sensibles dans Slack

### 7.3 Sentry
- ✅ Ajouter des breadcrumbs avant les opérations critiques
- ✅ Enrichir les erreurs avec du contexte
- ✅ Utiliser des tags pour filtrer dans Sentry
- ❌ Ne pas capturer d'informations personnelles sensibles

### 7.4 Performance
- ✅ Tous les logs/alertes sont asynchrones (pas de blocage)
- ✅ Rate limiting sur les WebSockets
- ✅ Sampling pour Sentry (éviter les coûts)

---

## 8. Dépannage

### Sentry ne reçoit pas les erreurs
1. Vérifier que `SENTRY_DSN` est défini
2. Vérifier la connexion internet
3. Vérifier les logs : `[ERROR] Failed to send to Sentry`

### Slack ne reçoit pas les notifications
1. Vérifier que `SLACK_ENABLED=true`
2. Vérifier que `SLACK_WEBHOOK_URL` est correct
3. Tester le webhook avec `curl`
4. Vérifier les logs : `[ERROR] Failed to send Slack notification`

### Les logs ne sont pas créés
1. Vérifier les permissions sur le dossier `logs/`
2. Vérifier l'espace disque disponible
3. Vérifier la variable `LOG_LEVEL`

### Trop d'alertes Slack
1. Réduire le sampling Sentry
2. Augmenter les seuils d'alerte
3. Filtrer les événements dans `securityAlerts.js`

---

## 9. Maintenance

### Surveillance quotidienne
- Vérifier le tableau de bord Sentry
- Vérifier les alertes Slack critiques
- Vérifier l'espace disque pour les logs

### Surveillance hebdomadaire
- Analyser les tendances dans Sentry
- Revoir les alertes de sécurité
- Nettoyer les vieux logs si nécessaire

### Surveillance mensuelle
- Revoir les taux de sampling
- Optimiser les performances basées sur les métriques
- Mettre à jour la documentation si nécessaire

---

## 10. Ressources

- [Documentation Sentry Node.js](https://docs.sentry.io/platforms/node/)
- [Documentation Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Documentation Winston](https://github.com/winstonjs/winston)
- [Documentation Socket.IO](https://socket.io/docs/v4/)
