# PBS Notify - Dockerfile
FROM node:20-alpine

# Créer le répertoire de l'application
WORKDIR /app

# Copier les fichiers package.json
COPY backend/package*.json ./backend/

# Installer les dépendances
WORKDIR /app/backend
RUN npm ci --only=production

# Copier le reste des fichiers backend
COPY backend/ .

# Copier les fichiers frontend
WORKDIR /app
COPY frontend/ ./frontend/

# Créer le répertoire pour la base de données
RUN mkdir -p /app/backend/data

# Exposer le port
EXPOSE 3000

# Variables d'environnement par défaut
ENV NODE_ENV=production \
    PORT=3000

# Retourner au répertoire backend pour exécuter le serveur
WORKDIR /app/backend

# Commande de démarrage
CMD ["node", "server.js"]
