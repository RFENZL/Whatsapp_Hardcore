# WhatsApp Hardcore – Application de Messagerie Instantanée

Application de messagerie instantanée temps réel complète basée sur la stack MEVN (MongoDB, Express, Vue 3, Node.js) avec Socket.IO.

## 📚 Stack Technique

- **Frontend** : Vue 3 (Composition API) + Vite + TailwindCSS
- **Backend** : Node.js + Express + Socket.IO + MongoDB (Mongoose)
- **Real-time** : Socket.IO avec Redis adapter pour multi-instance
- **Auth** : JWT stateless
- **Monitoring** : Sentry + Winston Logger
- **Tests** : Mocha + Chai + nyc, MongoDB en mémoire

## 🎯 Fonctionnalités Principales

### Messagerie
- ✅ Messages texte/média (image, video, audio, file)
- ✅ Conversations 1-to-1 et groupes avec permissions
- ✅ Statuts de messages (pending → sent → delivered → read)
- ✅ Édition/suppression de messages
- ✅ Réponses, réactions emoji, mentions (@user)
- ✅ Messages épinglés et éphémères (auto-suppression)
- ✅ Transfert de messages (forward)
- ✅ Recherche avancée (textuelle, par type, dates, expéditeur)

### Temps Réel (Socket.IO)
- ✅ Indicateurs de saisie (typing)
- ✅ Présence utilisateur (online/offline/last seen)
- ✅ Statuts personnalisés (away, busy, dnd)
- ✅ Last seen par conversation
- ✅ Rooms par conversation
- ✅ Récupération messages manqués après reconnexion
- ✅ Redis adapter multi-instance
- ✅ Namespaces Socket.IO (/messages, /notifications)

### Notifications
- ✅ Système de notifications persistantes (10 types)
- ✅ Priorités (low, normal, high, urgent)
- ✅ Notifications de mentions et forward
- ✅ Queue pour utilisateurs hors ligne (7 jours)
- ✅ Auto-suppression après 7 jours (TTL)

### Sécurité & Performance
- ✅ Rate limiting WebSocket (30 events/10s)
- ✅ Gestion de conflits (message locking)
- ✅ Heartbeat & monitoring de latence
- ✅ Logging détaillé avec rotation
- ✅ Optimisations broadcast

### Contacts & Groupes
- ✅ Gestion des contacts (ajout, blocage, favoris)
- ✅ Groupes avec rôles (owner/admin/moderator/member)
- ✅ Permissions et historique d'activité

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 16+
- MongoDB (local ou Docker)
- Redis (optionnel, pour multi-instance)

### Développement Local

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend (nouveau terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Production

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run serve:dist
```

Le backend servira le contenu statique du frontend depuis `frontend/dist`.

## ⚙️ Configuration

### Variables Backend (.env)
```bash
# Serveur
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/tpchat

# Auth
JWT_SECRET=your_secret_key
JWT_EXPIRATION=7d

# CORS
CLIENT_ORIGIN=http://localhost:5173

# Redis (optionnel)
USE_REDIS=true
REDIS_HOST=localhost
REDIS_PORT=6379

# Socket.IO
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000
SOCKET_LOGGING=false

# Rate Limiting
RATE_LIMIT_MAX=30
RATE_LIMIT_WINDOW=10000

# Monitoring
SENTRY_DSN=
```

### Variables Frontend (.env)
```bash
VITE_API_URL=http://localhost:4000
```

## 🧪 Tests

```bash
cd backend
npm test              # Tests unitaires + intégration
npm run coverage      # Rapport de couverture (≥70%)
```

Tests couverts :
- API REST (auth, users, messages, conversations)
- WebSocket (connexion, envoi, réception)
- Base de données (MongoDB memory server)

## 📖 Documentation

Documentation complète dans le dossier [`docs/`](./docs) :

- **[architecture.md](./docs/architecture.md)** : Architecture client/serveur, WebSockets, flux de données
- **[api.md](./docs/api.md)** : Documentation API REST et événements WebSocket
- **[data-models.md](./docs/data-models.md)** : Schémas MongoDB détaillés
- **[advanced-features.md](./docs/advanced-features.md)** : Fonctionnalités Socket.IO avancées (namespaces, rate limiting, heartbeat, etc.)
- **[tests.md](./docs/tests.md)** : Stratégie de tests et couverture
- **[user-guide.md](./docs/user-guide.md)** : Guide utilisateur
- **[user-stories.md](./docs/user-stories.md)** : User stories et cas d'usage
- **[dev-guide.md](./docs/dev-guide.md)** : Guide développeur et roadmap technique

## 🏗️ Architecture

### Structure Backend
```
backend/src/
├── models/          # Schémas Mongoose (User, Message, Conversation, etc.)
├── controllers/     # Logique métier
├── routes/          # Routes Express
├── middleware/      # Auth, validation, rate limiting
├── socket/          # Handlers WebSocket + namespaces
│   ├── handlers.js           # Legacy handlers
│   ├── messagesNamespace.js  # /messages namespace
│   ├── notificationsNamespace.js  # /notifications namespace
│   └── middlewares.js        # Socket.IO middlewares
├── jobs/            # Tâches planifiées (cleanup)
└── utils/           # Logger, Redis, message queue
```

### Structure Frontend
```
frontend/src/
├── components/      # Composants Vue (Sidebar, ChatPane, Composer, etc.)
└── lib/            # API client, Socket.IO, storage
```

### Architecture Socket.IO
```
/ (default)          → Connexion, rooms, legacy handlers
/messages           → Messages, typing, heartbeat, message locks
/notifications      → Notifications persistantes, subscriptions
```

## 📡 API Highlights

### REST Endpoints
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/messages/conversation/:id` - Historique messages
- `POST /api/messages` - Envoyer message
- `GET /api/notifications` - Liste notifications
- `GET /api/contacts` - Liste contacts
- `POST /api/groups` - Créer groupe

### Socket.IO Events
- `message:new` - Nouveau message
- `message:deleted` - Message supprimé
- `user:typing` - Indicateur de saisie
- `user-online` / `user-offline` - Présence
- `get-missed-messages` - Sync après reconnexion
- `heartbeat` - Monitoring latence
- `message:lock` / `message:unlock` - Gestion conflits

## 🔮 Roadmap

- 📞 Appels audio/vidéo (WebRTC)
- 🔐 Chiffrement end-to-end
- 📱 Application mobile (React Native)
- 🌐 PWA avec notifications push
- 📊 Dashboard analytics admin
- 🤖 Bots et intégrations
- 🌍 Internationalisation (i18n)

## 📄 License

MIT

