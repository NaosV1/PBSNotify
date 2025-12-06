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

    // Table pour les utilisateurs
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table pour les tokens webhook
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS webhook_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        ip_whitelist TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used DATETIME,
        is_active INTEGER DEFAULT 1
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

  // === USERS ===
  createUser(username, passwordHash) {
    const stmt = this.db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    try {
      const result = stmt.run(username, passwordHash);
      return result.lastInsertRowid;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  getUserByUsername(username) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  }

  getAllUsers() {
    const stmt = this.db.prepare('SELECT id, username, created_at FROM users');
    return stmt.all();
  }

  // === WEBHOOK TOKENS ===
  createWebhookToken(token, name, ipWhitelist = null) {
    const stmt = this.db.prepare(
      'INSERT INTO webhook_tokens (token, name, ip_whitelist) VALUES (?, ?, ?)'
    );
    try {
      const result = stmt.run(token, name, ipWhitelist);
      return result.lastInsertRowid;
    } catch (error) {
      console.error('Error creating webhook token:', error);
      return null;
    }
  }

  getWebhookToken(token) {
    const stmt = this.db.prepare('SELECT * FROM webhook_tokens WHERE token = ? AND is_active = 1');
    return stmt.get(token);
  }

  getAllWebhookTokens() {
    const stmt = this.db.prepare('SELECT * FROM webhook_tokens ORDER BY created_at DESC');
    return stmt.all();
  }

  updateWebhookTokenLastUsed(token) {
    const stmt = this.db.prepare('UPDATE webhook_tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?');
    stmt.run(token);
  }

  deleteWebhookToken(id) {
    const stmt = this.db.prepare('DELETE FROM webhook_tokens WHERE id = ?');
    stmt.run(id);
  }

  toggleWebhookToken(id, isActive) {
    const stmt = this.db.prepare('UPDATE webhook_tokens SET is_active = ? WHERE id = ?');
    stmt.run(isActive ? 1 : 0, id);
  }

  close() {
    this.db.close();
  }
}

module.exports = new DatabaseService();
