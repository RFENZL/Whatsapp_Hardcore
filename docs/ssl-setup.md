# Configuration SSL/TLS - HTTPS et WSS

Ce document explique comment configurer HTTPS et WebSocket Secure (WSS) pour le projet WhatsApp Hardcore.

## 📋 Table des matières

- [Pourquoi HTTPS et WSS ?](#pourquoi-https-et-wss)
- [Configuration en développement](#configuration-en-développement)
- [Configuration en production](#configuration-en-production)
- [Désactiver HTTPS (non recommandé)](#désactiver-https-non-recommandé)
- [Vérification de la configuration](#vérification-de-la-configuration)
- [Dépannage](#dépannage)

## 🔒 Pourquoi HTTPS et WSS ?

### HTTPS (HyperText Transfer Protocol Secure)
- **Chiffrement des données** : Toutes les communications entre le client et le serveur sont chiffrées
- **Authentification** : Garantit que vous communiquez avec le bon serveur
- **Intégrité** : Les données ne peuvent pas être modifiées en transit
- **Confiance** : Les navigateurs modernes marquent les sites HTTP comme "non sécurisés"
- **Requis pour PWA** : Les Progressive Web Apps nécessitent HTTPS

### WSS (WebSocket Secure)
- **Chiffrement des WebSockets** : Les connexions temps réel sont sécurisées
- **Même niveau de sécurité que HTTPS** : Utilise TLS/SSL
- **Protection contre les attaques** : Man-in-the-middle, eavesdropping, etc.
- **Requis en production** : Les navigateurs bloquent les connexions WS non sécurisées depuis des pages HTTPS

## 🛠️ Configuration en développement

### Étape 1 : Générer des certificats auto-signés

Les certificats auto-signés sont parfaits pour le développement local mais **ne doivent jamais être utilisés en production**.

#### Windows (PowerShell)

```powershell
# Naviguer vers le dossier backend
cd backend\certs

# Générer les certificats avec OpenSSL
openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
  -keyout localhost-key.pem `
  -out localhost-cert.pem `
  -subj "/C=FR/ST=France/L=Paris/O=WhatsappHardcore/CN=localhost"
```

#### Linux/Mac

```bash
# Naviguer vers le dossier backend
cd backend/certs

# Générer les certificats avec OpenSSL
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout localhost-key.pem \
  -out localhost-cert.pem \
  -subj "/C=FR/ST=France/L=Paris/O=WhatsappHardcore/CN=localhost"
```

Les fichiers générés :
- `localhost-cert.pem` : Certificat public
- `localhost-key.pem` : Clé privée

### Étape 2 : Installer OpenSSL (si nécessaire)

#### Windows
- Télécharger depuis : https://slproweb.com/products/Win32OpenSSL.html
- Ou installer via Chocolatey : `choco install openssl`

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install openssl
```

#### Mac
```bash
brew install openssl
```

### Étape 3 : Configuration des variables d'environnement

Copier `.env.example` vers `.env` dans le dossier `backend` :

```env
# SSL/TLS Configuration
USE_HTTPS=true
SSL_CERT_PATH=./certs/localhost-cert.pem
SSL_KEY_PATH=./certs/localhost-key.pem

# Mettre à jour CLIENT_ORIGIN
CLIENT_ORIGIN=https://localhost:5173
```

Et dans le dossier `frontend` :

```env
VITE_API_BASE=https://localhost:4000
VITE_WS_BASE=https://localhost:4000
```

### Étape 4 : Accepter le certificat auto-signé dans le navigateur

Lors du premier accès à `https://localhost:4000` ou `https://localhost:5173`, le navigateur affichera un avertissement de sécurité car le certificat est auto-signé.

#### Chrome/Edge
1. Cliquer sur "Avancé"
2. Cliquer sur "Continuer vers localhost (non sécurisé)"

#### Firefox
1. Cliquer sur "Avancé"
2. Cliquer sur "Accepter le risque et continuer"

> **Note** : Vous devrez accepter le certificat pour le backend (port 4000) ET le frontend (port 5173).

### Étape 5 : Démarrer les serveurs

```bash
# Backend
cd backend
npm start

# Frontend (dans un autre terminal)
cd frontend
npm run dev
```

Vous devriez voir dans les logs du backend :
```
Server started on https://localhost:4000
HTTPS server created with SSL certificates
websocket: wss://localhost:4000
```

## 🚀 Configuration en production

En production, utilisez **toujours** des certificats SSL valides émis par une autorité de certification reconnue.

### Option 1 : Let's Encrypt (Gratuit et recommandé)

Let's Encrypt fournit des certificats SSL gratuits et reconnus par tous les navigateurs.

#### Installation avec Certbot

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install certbot

# Générer un certificat pour votre domaine
sudo certbot certonly --standalone -d votre-domaine.com -d www.votre-domaine.com
```

Les certificats seront générés dans :
- Certificat : `/etc/letsencrypt/live/votre-domaine.com/fullchain.pem`
- Clé privée : `/etc/letsencrypt/live/votre-domaine.com/privkey.pem`

#### Configuration des variables d'environnement

```env
USE_HTTPS=true
SSL_CERT_PATH=/etc/letsencrypt/live/votre-domaine.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/votre-domaine.com/privkey.pem
CLIENT_ORIGIN=https://votre-domaine.com
```

#### Renouvellement automatique

Les certificats Let's Encrypt expirent après 90 jours. Configurer le renouvellement automatique :

```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Ajouter une tâche cron pour le renouvellement automatique
sudo crontab -e

# Ajouter cette ligne pour vérifier deux fois par jour
0 0,12 * * * certbot renew --quiet --post-hook "systemctl restart whatsapp-hardcore"
```

### Option 2 : Reverse Proxy avec Nginx

Une approche courante est d'utiliser Nginx comme reverse proxy pour gérer SSL/TLS.

#### Installation de Nginx

```bash
sudo apt-get update
sudo apt-get install nginx
```

#### Configuration Nginx

```nginx
# /etc/nginx/sites-available/whatsapp-hardcore
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    
    # Redirection HTTP vers HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com www.votre-domaine.com;
    
    # Certificats SSL
    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;
    
    # Configuration SSL recommandée
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # HSTS (optionnel mais recommandé)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # Proxy vers l'application Node.js
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Support WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activer le site :

```bash
sudo ln -s /etc/nginx/sites-available/whatsapp-hardcore /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Avec cette configuration, vous pouvez désactiver HTTPS dans l'application Node.js car Nginx s'en charge :

```env
USE_HTTPS=false  # Nginx gère SSL/TLS
CLIENT_ORIGIN=https://votre-domaine.com
```

### Option 3 : Hébergement Cloud (AWS, Azure, Google Cloud)

Les plateformes cloud offrent des solutions de gestion SSL/TLS intégrées :

- **AWS** : Elastic Load Balancer + Certificate Manager
- **Azure** : Application Gateway + Key Vault
- **Google Cloud** : Load Balancer + Certificate Manager
- **Heroku** : SSL automatique pour les domaines personnalisés
- **DigitalOcean** : Load Balancer avec Let's Encrypt intégré

Consultez la documentation de votre fournisseur cloud pour les détails spécifiques.

## ⚠️ Désactiver HTTPS (non recommandé)

Pour désactiver HTTPS (uniquement en développement local) :

```env
# backend/.env
USE_HTTPS=false
CLIENT_ORIGIN=http://localhost:5173

# frontend/.env
VITE_API_BASE=http://localhost:4000
VITE_WS_BASE=http://localhost:4000
```

> **⚠️ ATTENTION** : Ne jamais désactiver HTTPS en production ! Vos données et celles de vos utilisateurs seraient exposées.

## ✅ Vérification de la configuration

### 1. Vérifier que le serveur démarre avec HTTPS

```bash
cd backend
npm start
```

Vous devriez voir :
```
Server started on https://localhost:4000
HTTPS server created with SSL certificates
websocket: wss://localhost:4000
```

### 2. Tester la connexion HTTPS

```bash
# Avec curl (ignorer le certificat auto-signé en dev)
curl -k https://localhost:4000/api/auth/health

# Ou dans le navigateur
# Ouvrir https://localhost:4000/api/auth/health
```

### 3. Vérifier les WebSockets sécurisés (WSS)

Ouvrir la console du navigateur (F12) et vérifier les logs :
```
[Socket] Creating socket connection { base: 'https://localhost:4000', providedToken: true }
[Socket] Connected { socketId: '...' }
```

Dans l'onglet "Réseau" (Network), chercher la connexion WebSocket :
- URL doit commencer par `wss://` (et non `ws://`)
- Statut doit être 101 (Switching Protocols)

### 4. Tester le certificat SSL

Utiliser des outils en ligne pour vérifier la configuration SSL en production :
- [SSL Labs](https://www.ssllabs.com/ssltest/)
- [SSL Checker](https://www.sslshopper.com/ssl-checker.html)

## 🔧 Dépannage

### Problème : "unable to get local issuer certificate"

**Cause** : Le certificat auto-signé n'est pas reconnu.

**Solution en développement** :
```bash
# Node.js (temporaire, pour tests uniquement)
NODE_TLS_REJECT_UNAUTHORIZED=0 npm start
```

> ⚠️ Ne JAMAIS utiliser `NODE_TLS_REJECT_UNAUTHORIZED=0` en production !

### Problème : "ENOENT: no such file or directory" pour les certificats

**Cause** : Les certificats n'existent pas ou le chemin est incorrect.

**Solutions** :
1. Vérifier que les certificats existent :
   ```bash
   ls -la backend/certs/
   ```

2. Vérifier les chemins dans `.env` :
   ```env
   SSL_CERT_PATH=./certs/localhost-cert.pem
   SSL_KEY_PATH=./certs/localhost-key.pem
   ```

3. Régénérer les certificats si nécessaire (voir Étape 1)

### Problème : WebSocket ne se connecte pas (CORS ou Mixed Content)

**Cause** : Le frontend (HTTPS) essaie de se connecter à un backend (HTTP) ou vice-versa.

**Solution** : S'assurer que frontend et backend utilisent tous les deux HTTPS :
```env
# frontend/.env
VITE_API_BASE=https://localhost:4000
VITE_WS_BASE=https://localhost:4000

# backend/.env
USE_HTTPS=true
```

### Problème : "ERR_CERT_AUTHORITY_INVALID" en production

**Cause** : Certificat expiré, invalide ou auto-signé utilisé en production.

**Solution** : Utiliser Let's Encrypt ou un certificat valide d'une autorité de certification reconnue.

### Problème : Le navigateur affiche "Not Secure" malgré HTTPS

**Causes possibles** :
1. Certificat expiré
2. Certificat auto-signé (normal en dev)
3. Ressources mixtes (certaines requêtes en HTTP)

**Solution** :
- En développement : Accepter le certificat auto-signé
- En production : Utiliser un certificat valide
- Vérifier qu'aucune ressource n'est chargée en HTTP

### Problème : "Mixed Content" dans la console

**Cause** : Certaines ressources sont chargées en HTTP depuis une page HTTPS.

**Solution** : S'assurer que toutes les URLs utilisent HTTPS :
```javascript
// ❌ Mauvais
const socket = io('http://localhost:4000');

// ✅ Bon
const socket = io('https://localhost:4000');
```

## 📚 Ressources supplémentaires

- [Let's Encrypt - Getting Started](https://letsencrypt.org/getting-started/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [OWASP Transport Layer Protection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)
- [Socket.IO Security](https://socket.io/docs/v4/security/)
- [Node.js HTTPS Module](https://nodejs.org/api/https.html)

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :
1. Vérifier les logs du serveur backend
2. Vérifier la console du navigateur (F12)
3. Consulter la documentation officielle
4. Ouvrir une issue sur GitHub

---

**Dernière mise à jour** : Novembre 2025
