const Database = require('better-sqlite3');
const path = require('path');

class DatabaseService {
  constructor() {
    // Support pour Docker : utiliser le répertoire data si défini
    const dbDir = process.env.DB_PATH || __dirname;
    const dbPath = path.join(dbDir, 'notifications.db');
    console.log(`📂 Database path: ${dbPath}`);
    this.db = new Database(dbPath);
    this.initTables();
  }

  initTables() {
    // Table pour les notifications
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('success', 'error')),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table pour les abonnements push
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Database tables initialized');
  }

  // === NOTIFICATIONS ===
  addNotification(message, status) {
    const stmt = this.db.prepare('INSERT INTO notifications (message, status) VALUES (?, ?)');
    const result = stmt.run(message, status);
    return result.lastInsertRowid;
  }

  getNotifications(limit = 100) {
    const stmt = this.db.prepare('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT ?');
    return stmt.all(limit);
  }

  getNotificationById(id) {
    const stmt = this.db.prepare('SELECT * FROM notifications WHERE id = ?');
    return stmt.get(id);
  }

  // === SUBSCRIPTIONS ===
  addSubscription(subscription) {
    const { endpoint, keys } = subscription;
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)'
    );

    try {
      stmt.run(endpoint, keys.p256dh, keys.auth);
      return true;
    } catch (error) {
      console.error('Error adding subscription:', error);
      return false;
    }
  }

  getAllSubscriptions() {
    const stmt = this.db.prepare('SELECT * FROM subscriptions');
    return stmt.all().map(row => ({
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth
      }
    }));
  }

  removeSubscription(endpoint) {
    const stmt = this.db.prepare('DELETE FROM subscriptions WHERE endpoint = ?');
    stmt.run(endpoint);
  }

  close() {
    this.db.close();
  }
}

module.exports = new DatabaseService();
