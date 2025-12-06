# 📦 PBS Notify

Système de notifications push web pour Proxmox Backup Server (PBS). Reçoit les webhooks de Proxmox, stocke les notifications dans SQLite et envoie des notifications push à tous les appareils abonnés.

## 🚀 Fonctionnalités

- **Webhook** pour recevoir les notifications de Proxmox
- **Base de données SQLite** pour stocker l'historique
- **Push Web Notifications** avec VAPID
- **PWA (Progressive Web App)** installable
- **Interface moderne** avec statistiques et historique
- **Support multi-appareils** (tous les abonnés reçoivent les notifications)

## 📋 Prérequis

- Node.js 16+
- npm ou yarn
- Un serveur Proxmox configuré pour envoyer des webhooks

## 🔧 Installation

### 1. Cloner le projet

```bash
cd PBSNotify
```

### 2. Installer les dépendances du backend

```bash
cd backend
npm install
```

### 3. Configuration

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

1. **Accédez à l'interface web** : `http://localhost:3000`

2. **Activez les notifications** :
   - Cliquez sur "Activer les notifications"
   - Acceptez la permission dans le navigateur
   - Vous êtes maintenant abonné !

3. **Testez** :
   ```bash
   curl -X POST http://localhost:3000/webhook \
     -H "Content-Type: application/json" \
     -d '{"message": "Test notification", "status": "success"}'
   ```

4. **Installez la PWA** (optionnel) :
   - Sur Chrome/Edge : cliquez sur l'icône d'installation dans la barre d'adresse
   - Sur mobile : "Ajouter à l'écran d'accueil"

## 🔌 API Endpoints

### POST /webhook
Reçoit les notifications de Proxmox

**Body:**
```json
{
  "message": "string",
  "status": "success|error"
}
```

### POST /subscribe
Enregistre un nouvel abonnement push

### POST /unsubscribe
Supprime un abonnement

### GET /notifications
Liste toutes les notifications (limite : 100)

**Query params:**
- `limit` (optionnel) : nombre de notifications à retourner

### GET /notifications/:id
Récupère une notification spécifique

### GET /vapid-public-key
Retourne la clé publique VAPID pour les abonnements

### GET /health
Statut du serveur

## 🗂️ Structure du projet

```
PBSNotify/
├── backend/
│   ├── server.js           # Serveur Express
│   ├── db.js               # Gestion SQLite
│   ├── push-service.js     # Service de push notifications
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── index.html          # Interface PWA
│   ├── app.js              # Logique frontend
│   ├── service-worker.js   # Service Worker
│   ├── style.css           # Styles
│   └── manifest.json       # Configuration PWA
└── README.md
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

### Pour la production :

1. **Utilisez HTTPS** (obligatoire pour les Service Workers)
2. **Protégez le webhook** avec une authentification
3. **Ajoutez un reverse proxy** (nginx, Caddy, Traefik)
4. **Limitez les requêtes** (rate limiting)

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

## 📝 TODO / Améliorations futures

- [ ] Authentification pour le webhook
- [ ] Support multi-canaux (Discord, Telegram, Email)
- [ ] Filtres de notifications
- [ ] Dashboard avec graphiques
- [ ] Notifications planifiées
- [ ] Export des notifications (CSV, JSON)
- [ ] Mode sombre/clair

## 📄 Licence

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📞 Support

Pour toute question ou problème, ouvrez une issue sur GitHub.
