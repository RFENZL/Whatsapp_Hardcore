# Déploiement & DevOps

## Docker & docker-compose

Le fichier `docker-compose.yml` définit les services applicatifs (extrait simplifié) :

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    env_file:
      - ./backend/.env.example
    depends_on:
      - mongo
    restart: unless-stopped
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    env_file:
      - ./frontend/.env.example
    depends_on:
      - backend
    restart: unless-stopped
  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
volumes:
  mongo_data:

```

En général :

- un service `backend` construit à partir de `backend/Dockerfile`
- un service `frontend` construit à partir de `frontend/`
- un service `mongodb`
- éventuellement `mongo-express` ou autre outil

## CI/CD

Dans `.github/workflows/ci.yml` :

- Lint du backend (ESLint)
- Lint du frontend (ESLint / Vite)
- Exécution des tests backend (`npm test` dans backend)
- Exécution des tests frontend (`npm test` / `vitest` dans frontend)
- Génération de rapports (coverage)
- Conditions de succès avant déploiement

Le pipeline peut être étendu pour :

- build des images Docker
- push sur un registry
- déploiement sur un serveur ou cluster
