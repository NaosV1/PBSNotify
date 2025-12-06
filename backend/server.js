require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const pushService = require('./push-service');

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

// === WEBHOOK ENDPOINT ===
app.post('/webhook', async (req, res) => {
  try {
    const { message, status } = req.body;

    // Validation
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

    // Enregistrer la notification dans la DB
    const notificationId = db.addNotification(message, status);
    console.log(`✓ Notification saved (ID: ${notificationId})`);

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
