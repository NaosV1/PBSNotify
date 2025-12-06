const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// JWT Secret (devrait être dans .env en production)
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: Using random JWT_SECRET. Set JWT_SECRET in .env for production!');
}

class AuthService {
  // Hash un mot de passe
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  // Vérifie un mot de passe
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // Génère un token JWT
  generateToken(userId, username) {
    return jwt.sign(
      { userId, username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  // Vérifie un token JWT
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  // Génère un token webhook aléatoire
  generateWebhookToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Middleware d'authentification
  requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const token = authHeader.substring(7);
    const decoded = this.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }

    req.user = decoded;
    next();
  }

  // Vérifie si une IP est dans la whitelist
  checkIPWhitelist(ip, whitelist) {
    if (!whitelist) return true; // Pas de whitelist = autorisé

    const ips = whitelist.split(',').map(ip => ip.trim());
    return ips.includes(ip) || ips.includes('*');
  }

  // Extrait l'IP du client (supporte les proxies)
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress;
  }
}

module.exports = new AuthService();
