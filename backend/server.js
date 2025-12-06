require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const pushService = require('./push-service');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// === AUTHENTICATION ENDPOINTS ===
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = db.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Nom d\'utilisateur déjà utilisé' });
    }

    // Hasher le mot de passe
    const passwordHash = await auth.hashPassword(password);

    // Créer l'utilisateur
    const userId = db.createUser(username, passwordHash);

    if (!userId) {
      return res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
    }

    // Générer un token
    const token = auth.generateToken(userId, username);

    res.status(201).json({
      success: true,
      token,
      user: { id: userId, username }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }

    // Récupérer l'utilisateur
    const user = db.getUserByUsername(username);

    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    // Vérifier le mot de passe
    const isValid = await auth.verifyPassword(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    // Générer un token
    const token = auth.generateToken(user.id, user.username);

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false });
  }

  const token = authHeader.substring(7);
  const decoded = auth.verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ valid: false });
  }

  res.json({ valid: true, user: decoded });
});

// === WEBHOOK TOKEN MANAGEMENT ===
app.get('/api/webhook-tokens', auth.requireAuth.bind(auth), (req, res) => {
  try {
    const tokens = db.getAllWebhookTokens();
    res.json({ success: true, tokens });
  } catch (error) {
    console.error('Get tokens error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/webhook-tokens', auth.requireAuth.bind(auth), (req, res) => {
  try {
    const { name, ipWhitelist } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const token = auth.generateWebhookToken();
    const tokenId = db.createWebhookToken(token, name, ipWhitelist || null);

    if (!tokenId) {
      return res.status(500).json({ error: 'Erreur lors de la création du token' });
    }

    res.status(201).json({
      success: true,
      token: { id: tokenId, token, name, ip_whitelist: ipWhitelist }
    });

  } catch (error) {
    console.error('Create token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/webhook-tokens/:id', auth.requireAuth.bind(auth), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    db.deleteWebhookToken(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/webhook-tokens/:id/toggle', auth.requireAuth.bind(auth), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { isActive } = req.body;
    db.toggleWebhookToken(id, isActive);
    res.json({ success: true });
  } catch (error) {
    console.error('Toggle token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === WEBHOOK ENDPOINT ===
app.post('/webhook', async (req, res) => {
  try {
    const { message, status } = req.body;
    const token = req.headers['x-webhook-token'] || req.query.token;
    const clientIP = auth.getClientIP(req);

    // Validation du token
    if (!token) {
      return res.status(401).json({ error: 'Token webhook requis' });
    }

    const webhookToken = db.getWebhookToken(token);

    if (!webhookToken) {
      return res.status(401).json({ error: 'Token webhook invalide ou inactif' });
    }

    // Vérification de la whitelist IP
    if (!auth.checkIPWhitelist(clientIP, webhookToken.ip_whitelist)) {
      console.log(`❌ IP rejected: ${clientIP} (whitelist: ${webhookToken.ip_whitelist})`);
      return res.status(403).json({ error: 'IP non autorisée' });
    }

    // Validation du contenu
    if (!message || !status) {
      return res.status(400).json({
        error: 'Missing required fields: message and status'
      });
    }

    if (!['success', 'error'].includes(status)) {
      return res.status(400).json({
        error: 'Status must be either "success" or "error"'
      });
    }

    // Mettre à jour la dernière utilisation du token
    db.updateWebhookTokenLastUsed(token);

    // Enregistrer la notification dans la DB
    const notificationId = db.addNotification(message, status);
    console.log(`✓ Notification saved (ID: ${notificationId}) from ${webhookToken.name} (${clientIP})`);

    // Récupérer la notification complète
    const notification = db.getNotificationById(notificationId);

    // Envoyer les push notifications
    const sentCount = await pushService.sendToAll(notification);

    res.status(200).json({
      success: true,
      notification: {
        id: notificationId,
        message,
        status,
        timestamp: notification.timestamp
      },
      pushSent: sentCount
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === SUBSCRIPTION ENDPOINTS ===
app.post('/subscribe', (req, res) => {
  try {
    const subscription = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    const success = db.addSubscription(subscription);

    if (success) {
      console.log('✓ New subscription added');
      res.status(201).json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to save subscription' });
    }

  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/unsubscribe', (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }

    db.removeSubscription(endpoint);
    console.log('✓ Subscription removed');
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === VAPID PUBLIC KEY ===
app.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: pushService.getPublicKey() });
});

// === NOTIFICATIONS ENDPOINTS ===
app.get('/notifications', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const notifications = db.getNotifications(limit);

    res.json({
      success: true,
      count: notifications.length,
      notifications
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/notifications/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const notification = db.getNotificationById(id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, notification });

  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === HEALTH CHECK ===
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    subscriptions: db.getAllSubscriptions().length
  });
});

// Servir le frontend en production
app.use(express.static('../frontend'));

// Démarrage du serveur
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   PBS Notify Backend - Running         ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log(`📊 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🔔 Subscriptions: ${db.getAllSubscriptions().length}`);
  console.log(`📝 Total notifications: ${db.getNotifications().length}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  db.close();
  process.exit(0);
});
