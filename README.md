# 📦 PBS Notify

Système de notifications push web pour Proxmox Backup Server (PBS). Reçoit les webhooks de Proxmox, stocke les notifications dans SQLite et envoie des notifications push à tous les appareils abonnés.

## 🚀 Fonctionnalités

- **Webhook sécurisé** pour recevoir les notifications de Proxmox
- **Authentification** avec gestion des utilisateurs
- **Tokens webhook** avec whitelist IP
- **Base de données SQLite** pour stocker l'historique
- **Push Web Notifications** avec VAPID
- **PWA (Progressive Web App)** installable
- **Interface d'administration** pour gérer les tokens
- **Interface moderne** avec statistiques et historique
- **Support multi-appareils** (tous les abonnés reçoivent les notifications)

## 📋 Prérequis

**Option Docker (Recommandé) :**
- Docker et Docker Compose
- Un serveur Proxmox configuré pour envoyer des webhooks

**Option manuelle :**
- Node.js 16+
- npm ou yarn
- Un serveur Proxmox configuré pour envoyer des webhooks

## 🔧 Installation

### Option 1 : Installation avec Docker (Recommandé)

#### 1. Cloner le projet

```bash
git clone https://github.com/NaosV1/PBSNotify.git
cd PBSNotify
```

#### 2. Générer les clés VAPID et JWT Secret

```bash
# Générer les clés VAPID
npx web-push generate-vapid-keys

# Générer le JWT Secret
openssl rand -hex 32
```

#### 3. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet :

```bash
cp .env.example .env
```

Éditez le fichier `.env` et ajoutez vos clés :

```env
# Port du serveur
PORT=3000

# Clés VAPID pour les notifications push
VAPID_PUBLIC_KEY=votre_clé_publique_vapid
VAPID_PRIVATE_KEY=votre_clé_privée_vapid
VAPID_SUBJECT=mailto:votre-email@example.com

# Secret JWT pour l'authentification (généré avec openssl rand -hex 32)
JWT_SECRET=votre_secret_jwt_aleatoire_64_caracteres

# Chemin de la base de données (Docker seulement)
DB_PATH=/app/backend/data
```

**Important :**
- Le `JWT_SECRET` doit être une chaîne aléatoire de 64 caractères minimum
- Ne partagez jamais vos clés VAPID ou JWT_SECRET
- Le système n'autorise qu'un seul compte administrateur

#### 4. Lancer avec Docker Compose

```bash
docker-compose up -d
```

L'application sera accessible sur `http://localhost:3000`

#### 5. Créer votre compte administrateur

Lors de votre première connexion :
1. Accédez à `http://localhost:3000`
2. Vous serez redirigé vers la page de login
3. Cliquez sur l'onglet **"Inscription"**
4. Créez votre compte (seul le premier compte sera autorisé)
5. Vous serez automatiquement connecté

#### Commandes utiles Docker

```bash
# Voir les logs
docker-compose logs -f

# Arrêter l'application
docker-compose down

# Reconstruire l'image après des modifications
docker-compose up -d --build

# Voir le statut
docker-compose ps

# Accéder au shell du conteneur
docker exec -it pbs-notify sh

# Réinitialiser le mot de passe (dans le conteneur)
docker exec -it pbs-notify node reset-password.js
```

#### Persistance des données

Les notifications et abonnements sont stockés dans le répertoire `./data` qui est monté comme volume Docker. Ce répertoire est créé automatiquement et persiste même si le conteneur est supprimé.

Pour sauvegarder vos données :
```bash
# Sauvegarder
tar -czf pbs-notify-backup.tar.gz data/

# Restaurer
tar -xzf pbs-notify-backup.tar.gz
```

### Option 2 : Installation manuelle

#### 1. Cloner le projet

```bash
git clone https://github.com/NaosV1/PBSNotify.git
cd PBSNotify
```

#### 2. Installer les dépendances du backend

```bash
cd backend
npm install
```

#### 3. Configuration

Au premier lancement, le serveur générera automatiquement des clés VAPID. Copiez-les dans un fichier `.env` :

```bash
cp .env.example .env
```

Lancez le serveur une première fois :

```bash
npm start
```

Copiez les clés VAPID affichées dans le terminal et ajoutez-les à votre fichier `.env` :

```env
PORT=3000
VAPID_PUBLIC_KEY=votre_clé_publique
VAPID_PRIVATE_KEY=votre_clé_privée
```

## 🏃 Démarrage

### Backend

```bash
cd backend
npm start
```

Le serveur démarre sur `http://localhost:3000`

### Frontend

Le frontend est servi automatiquement par le backend à l'adresse `http://localhost:3000`

## 📡 Configuration de Proxmox

### Configurer le webhook dans Proxmox VE/PBS

1. Accédez à votre interface Proxmox
2. Configurez un webhook pour envoyer les notifications à :

```
POST http://votre-serveur:3000/webhook
```

### Format du webhook

Le webhook attend un POST avec le format JSON suivant :

```json
{
  "message": "Backup completed successfully for VM 100",
  "status": "success"
}
```

**Paramètres :**
- `message` (string) : Le message de notification
- `status` (string) : `"success"` ou `"error"`

### Exemple avec curl

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Backup of VM 100 completed",
    "status": "success"
  }'
```

## 🎯 Utilisation

### 1. Première connexion et création de compte

**Important :** Le système n'autorise qu'un seul compte administrateur. Le premier utilisateur à s'inscrire sera le seul à pouvoir accéder à l'application.

1. Accédez à `http://localhost:3000` (vous serez redirigé vers `/login`)
2. Cliquez sur l'onglet **"Inscription"** (visible uniquement s'il n'y a pas encore de compte)
3. Créez votre compte administrateur
4. Vous serez automatiquement connecté et redirigé vers le tableau de bord

**Note :** Si un compte existe déjà, seul l'onglet "Connexion" sera visible.

### 2. Créer un token webhook

1. Accédez à l'administration : `http://localhost:3000/admin` (ou cliquez sur "Administration" dans le header)
2. Cliquez sur **"+ Nouveau token"**
3. Donnez un nom au token (ex: "Proxmox PBS")
4. (Optionnel) Ajoutez des IPs autorisées séparées par des virgules
   - Exemple : `192.168.1.100,192.168.1.101`
   - Ou `*` pour autoriser toutes les IPs
5. Cliquez sur **"Créer"**
6. **Copiez le token** (vous ne pourrez plus le voir après)

### 3. Configurer le webhook dans Proxmox

Utilisez le token créé dans votre requête webhook :

```bash
curl -X POST http://votre-serveur:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: VOTRE_TOKEN_ICI" \
  -d '{"message": "Test notification", "status": "success"}'
```

Ou en utilisant le paramètre URL :

```bash
curl -X POST "http://votre-serveur:3000/webhook?token=VOTRE_TOKEN_ICI" \
  -H "Content-Type: application/json" \
  -d '{"message": "Test notification", "status": "success"}'
```

### 4. Activer les notifications push

1. Accédez à l'interface principale : `http://localhost:3000`
2. Cliquez sur **"Activer les notifications"**
3. Acceptez la permission dans le navigateur
4. Vous recevrez maintenant les notifications !

### 5. Installer la PWA (optionnel)

- Sur Chrome/Edge : cliquez sur l'icône d'installation dans la barre d'adresse
- Sur mobile : "Ajouter à l'écran d'accueil"

## 🔌 API Endpoints

### Authentification

#### POST /api/auth/register
Créer un nouveau compte administrateur

**Body:**
```json
{
  "username": "admin",
  "password": "votre_mot_de_passe"
}
```

#### POST /api/auth/login
Se connecter et obtenir un token JWT

**Body:**
```json
{
  "username": "admin",
  "password": "votre_mot_de_passe"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": { "id": 1, "username": "admin" }
}
```

#### GET /api/auth/verify
Vérifier la validité d'un token JWT

**Headers:** `Authorization: Bearer <token>`

### Gestion des tokens webhook (nécessite authentification)

#### GET /api/webhook-tokens
Liste tous les tokens webhook

**Headers:** `Authorization: Bearer <token>`

#### POST /api/webhook-tokens
Créer un nouveau token webhook

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "Proxmox PBS",
  "ipWhitelist": "192.168.1.100,192.168.1.101" // optionnel
}
```

#### DELETE /api/webhook-tokens/:id
Supprimer un token webhook

**Headers:** `Authorization: Bearer <token>`

#### PATCH /api/webhook-tokens/:id/toggle
Activer/désactiver un token webhook

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "isActive": true
}
```

### Webhook

#### POST /webhook
Reçoit les notifications de Proxmox

**Headers:**
- `X-Webhook-Token: <votre_token>` (ou via paramètre `?token=<votre_token>`)
- `Content-Type: application/json`

**Body:**
```json
{
  "message": "string",
  "status": "success|error"
}
```

### Notifications et Push (nécessite authentification)

#### POST /subscribe
Enregistre un nouvel abonnement push

**Headers:** `Authorization: Bearer <token>`

#### POST /unsubscribe
Supprime un abonnement

**Headers:** `Authorization: Bearer <token>`

#### GET /notifications
Liste toutes les notifications (limite : 100)

**Headers:** `Authorization: Bearer <token>`

**Query params:**
- `limit` (optionnel) : nombre de notifications à retourner

#### GET /notifications/:id
Récupère une notification spécifique

**Headers:** `Authorization: Bearer <token>`

#### GET /vapid-public-key
Retourne la clé publique VAPID pour les abonnements

**Headers:** `Authorization: Bearer <token>`

### Autres endpoints

#### GET /health
Statut du serveur (pas d'authentification requise)

#### GET /api/auth/has-users
Vérifie si un utilisateur existe déjà dans le système

**Response:**
```json
{
  "hasUsers": true
}
```

## 🗂️ Structure du projet

```
PBSNotify/
├── backend/
│   ├── server.js           # Serveur Express avec API et routes
│   ├── db.js               # Gestion SQLite (users, tokens, notifs)
│   ├── auth.js             # Authentification JWT et bcrypt
│   ├── push-service.js     # Service de push notifications
│   ├── reset-password.js   # Script de réinitialisation du mot de passe
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── index.html          # Interface PWA principale (auth requise)
│   ├── login.html          # Page de connexion/inscription
│   ├── admin.html          # Panneau d'administration
│   ├── app.js              # Logique frontend principale
│   ├── admin.js            # Logique administration
│   ├── service-worker.js   # Service Worker pour PWA
│   ├── style.css           # Styles globaux
│   └── manifest.json       # Configuration PWA
├── Dockerfile              # Configuration Docker
├── docker-compose.yml      # Orchestration Docker
├── .dockerignore           # Fichiers à exclure de Docker
├── .env.example            # Exemple de variables d'environnement
├── reset-password.sh       # Script shell pour réinitialiser le mot de passe
├── RESET_PASSWORD.md       # Documentation du script de reset
└── README.md               # Documentation principale
```

## 🎨 Personnalisation

### Icônes PWA

Placez vos icônes dans `/frontend/` avec les tailles suivantes :
- icon-72.png
- icon-96.png
- icon-128.png
- icon-144.png
- icon-152.png
- icon-192.png
- icon-384.png
- icon-512.png
- badge-72.png (pour le badge de notification)

Vous pouvez générer ces icônes facilement avec des outils en ligne ou avec ImageMagick.

### Email de contact VAPID

Modifiez l'email dans `backend/push-service.js` ligne 28 :

```javascript
webpush.setVapidDetails(
  'mailto:votre-email@domaine.com',  // <-- Changez ici
  this.vapidKeys.publicKey,
  this.vapidKeys.privateKey
);
```

## 🔒 Sécurité

### Fonctionnalités de sécurité intégrées

- ✅ **Authentification JWT** pour l'accès à toutes les pages
- ✅ **Compte unique** - Un seul compte administrateur autorisé
- ✅ **Tokens webhook** uniques et révocables
- ✅ **Whitelist IP** pour restreindre l'accès au webhook
- ✅ **Mots de passe hashés** avec bcrypt (10 rounds)
- ✅ **Tokens générés cryptographiquement** sécurisés (32 bytes)
- ✅ **Protection des routes** - Toutes les pages et API nécessitent une authentification
- ✅ **Script de récupération** pour réinitialiser le mot de passe en cas d'oubli

### Pour la production :

1. **Utilisez HTTPS** (obligatoire pour les Service Workers)
2. **Configurez JWT_SECRET** dans `.env` avec une valeur aléatoire forte
3. **Utilisez la whitelist IP** pour les tokens webhook
4. **Ajoutez un reverse proxy** (nginx, Caddy, Traefik)
5. **Limitez les requêtes** (rate limiting)
6. **Sauvegardez régulièrement** la base de données

### Exemple de configuration nginx :

```nginx
server {
    listen 443 ssl http2;
    server_name pbs-notify.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🐛 Dépannage

### Les notifications ne s'affichent pas

1. Vérifiez que vous avez autorisé les notifications dans votre navigateur
2. Vérifiez que le Service Worker est actif (DevTools > Application > Service Workers)
3. Vérifiez les logs du backend

### Le Service Worker ne s'installe pas

1. Assurez-vous d'utiliser HTTPS (ou localhost)
2. Vérifiez la console du navigateur pour les erreurs
3. Essayez de désinstaller puis réinstaller le SW

### La base de données ne se crée pas

1. Vérifiez les permissions du dossier backend
2. Vérifiez que better-sqlite3 est bien installé

### Mot de passe oublié

Si vous avez oublié vos identifiants, vous pouvez réinitialiser le mot de passe :

**Installation Docker :**
```bash
docker exec -it pbs-notify node reset-password.js
```

**Installation manuelle :**
```bash
./reset-password.sh
```

Ou directement avec Node.js :
```bash
cd backend
node reset-password.js
```

**Le script vous offre deux options :**

1. **Réinitialiser le mot de passe** - Change le mot de passe sans supprimer le compte
2. **Supprimer le compte** - Supprime le compte pour en créer un nouveau via `/login`

**Note :** Le système est configuré pour n'accepter qu'un seul compte administrateur. Voir la [documentation complète](RESET_PASSWORD.md) pour plus de détails.

## 📝 TODO / Améliorations futures

- [x] Authentification complète (JWT)
- [x] Gestion des tokens webhook avec whitelist IP
- [x] Script de réinitialisation du mot de passe
- [x] Routes Express pour toutes les pages
- [ ] Support multi-canaux (Discord, Telegram, Email)
- [ ] Filtres de notifications
- [ ] Dashboard avec graphiques
- [ ] Notifications planifiées
- [ ] Export des notifications (CSV, JSON)
- [ ] Mode sombre/clair
- [ ] Gestion multi-utilisateurs (avec rôles)

## 📄 Licence

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📞 Support

Pour toute question ou problème, ouvrez une issue sur GitHub.
