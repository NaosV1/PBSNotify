const webpush = require('web-push');
const db = require('./db');

class PushNotificationService {
  constructor() {
    // Les clés VAPID seront générées au premier lancement si elles n'existent pas
    this.vapidKeys = null;
    this.initVapid();
  }

  initVapid() {
    // Vérifier si les clés existent dans les variables d'environnement
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      this.vapidKeys = {
        publicKey: process.env.VAPID_PUBLIC_KEY,
        privateKey: process.env.VAPID_PRIVATE_KEY
      };
      console.log('✓ VAPID keys loaded from environment');
    } else {
      // Générer de nouvelles clés
      this.vapidKeys = webpush.generateVAPIDKeys();
      console.log('\n⚠️  VAPID keys generated! Add these to your .env file:\n');
      console.log(`VAPID_PUBLIC_KEY=${this.vapidKeys.publicKey}`);
      console.log(`VAPID_PRIVATE_KEY=${this.vapidKeys.privateKey}\n`);
    }

    webpush.setVapidDetails(
      'mailto:admin@pbsnotify.local',
      this.vapidKeys.publicKey,
      this.vapidKeys.privateKey
    );
  }

  getPublicKey() {
    return this.vapidKeys.publicKey;
  }

  async sendNotification(subscription, payload) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);

      // Si l'abonnement n'est plus valide, le supprimer
      if (error.statusCode === 410) {
        db.removeSubscription(subscription.endpoint);
        console.log('Removed invalid subscription');
      }
      return false;
    }
  }

  async sendToAll(notification) {
    const subscriptions = db.getAllSubscriptions();

    const payload = {
      title: notification.status === 'success' ? '✓ PBS Backup Success' : '✗ PBS Backup Error',
      body: notification.message,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        id: notification.id,
        status: notification.status,
        timestamp: notification.timestamp
      }
    };

    console.log(`Sending push notification to ${subscriptions.length} subscriber(s)...`);

    const promises = subscriptions.map(sub => this.sendNotification(sub, payload));
    const results = await Promise.allSettled(promises);

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`✓ Sent to ${successCount}/${subscriptions.length} subscribers`);

    return successCount;
  }
}

module.exports = new PushNotificationService();
