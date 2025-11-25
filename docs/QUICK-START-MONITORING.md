# Guide de Démarrage Rapide - Monitoring et Alertes

## 🚀 Démarrage en 5 minutes

### 1. Logs de base (0 configuration requise)

Les logs fonctionnent immédiatement sans configuration :

```bash
cd backend
npm run dev
```

Les logs sont automatiquement créés dans `backend/logs/` :
- `combined-YYYY-MM-DD.log` - Tous les logs
- `error-YYYY-MM-DD.log` - Erreurs uniquement

**✅ C'est tout ! Les logs sont actifs.**

---

### 2. Activer Sentry (Optionnel - 2 minutes)

#### Étape 1 : Créer un compte Sentry
1. Aller sur https://sentry.io
2. S'inscrire gratuitement
3. Créer un nouveau projet "Node.js"

#### Étape 2 : Configurer
1. Copier le DSN fourni par Sentry
2. L'ajouter dans `backend/.env` :

```env
SENTRY_DSN=https://your-key@sentry.io/project-id
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

#### Étape 3 : Redémarrer
```bash
npm run dev
```

**✅ Sentry est actif ! Toutes les erreurs sont automatiquement capturées.**

---

### 3. Activer Slack (Optionnel - 3 minutes)

#### Étape 1 : Créer un Webhook Slack
1. Aller sur https://api.slack.com/apps
2. Cliquer "Create New App" → "From scratch"
3. Nommer l'app (ex: "WhatsApp Alerts")
4. Choisir votre workspace
5. Dans "Features" → "Incoming Webhooks" → Activer
6. Cliquer "Add New Webhook to Workspace"
7. Choisir le canal (ex: #alerts)
8. Copier l'URL du webhook

#### Étape 2 : Configurer
Dans `backend/.env` :

```env
SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

#### Étape 3 : Tester
```bash
npm run dev
```

Connectez-vous à l'application → Vous devriez recevoir une alerte Slack !

**✅ Slack est actif ! Vous recevrez des alertes pour les événements critiques.**

---

## 📊 Que surveiller ?

### Logs automatiques (sans configuration)
✅ Connexions/déconnexions
✅ Actions utilisateur
✅ Erreurs serveur
✅ Événements WebSocket
✅ Requêtes HTTP

### Alertes Sentry (si configuré)
🔔 Erreurs non gérées
🔔 Problèmes de performance
🔔 Traces des requêtes lentes

### Alertes Slack (si configuré)
🚨 Nouvelles connexions depuis localisations inhabituelles
🚨 Modifications de profil sensibles
🚨 Suppressions de sessions
🚨 Blocages de contacts
🚨 Tentatives de connexion échouées répétées

---

## 🔍 Vérifier que ça fonctionne

### Logs
```bash
# Voir les logs en temps réel
cd backend
tail -f logs/combined-*.log

# Voir uniquement les erreurs
tail -f logs/error-*.log
```

### Sentry
1. Aller sur https://sentry.io
2. Ouvrir votre projet
3. Vous devriez voir les événements arriver

### Slack
1. Faire une action (login, modifier profil, etc.)
2. Vérifier le canal Slack configuré
3. Vous devriez voir les alertes

---

## 🎯 Exemples d'utilisation

### Déclencher une alerte de connexion
```bash
# Se connecter depuis un nouvel emplacement
# → Alerte Slack + Log + Sentry breadcrumb
```

### Déclencher une alerte de modification
```bash
# Modifier son profil (username)
# → Alerte Slack si sensible + Log
```

### Voir une erreur dans Sentry
```bash
# Provoquer une erreur (ex: requête invalide)
# → Erreur capturée dans Sentry avec contexte complet
```

---

## ⚙️ Configuration avancée (optionnel)

### Ajuster les niveaux de log

Dans `.env` :
```env
# Développement : plus verbeux
LOG_LEVEL=debug

# Production : moins verbeux
LOG_LEVEL=info
```

### Ajuster le sampling Sentry

```env
# 100% des requêtes (coûteux)
SENTRY_TRACES_SAMPLE_RATE=1.0

# 10% des requêtes (recommandé)
SENTRY_TRACES_SAMPLE_RATE=0.1

# Désactiver le tracing
SENTRY_TRACES_SAMPLE_RATE=0.0
```

### Désactiver temporairement Slack

```env
SLACK_ENABLED=false
```

---

## 🐛 Dépannage

### Les logs ne sont pas créés
```bash
# Vérifier que le dossier existe
mkdir -p backend/logs

# Vérifier les permissions
chmod 755 backend/logs
```

### Sentry ne reçoit pas les erreurs
- Vérifier que `SENTRY_DSN` est correctement configuré
- Vérifier la connexion internet
- Vérifier les logs : `[ERROR] Failed to send to Sentry`

### Slack ne reçoit pas les notifications
- Vérifier que `SLACK_ENABLED=true`
- Vérifier que `SLACK_WEBHOOK_URL` est correct
- Tester avec curl :
```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test"}' \
  YOUR_WEBHOOK_URL
```

---

## 📚 Documentation complète

Pour plus de détails :
- `docs/monitoring.md` - Guide complet
- `docs/SECTION-5-IMPLEMENTATION.md` - Récapitulatif d'implémentation
- `.env.example` - Toutes les variables disponibles

---

## ✅ Checklist de vérification

- [ ] Les logs sont créés dans `backend/logs/`
- [ ] Les fichiers tournent quotidiennement
- [ ] Sentry DSN est configuré (si souhaité)
- [ ] Sentry reçoit les événements (si configuré)
- [ ] Slack webhook est configuré (si souhaité)
- [ ] Slack reçoit les alertes (si configuré)
- [ ] Les actions importantes sont loggées
- [ ] Les erreurs sont capturées

---

**🎉 Félicitations ! Votre système de monitoring est opérationnel !**
