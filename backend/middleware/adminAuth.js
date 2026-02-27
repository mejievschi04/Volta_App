/**
 * Middleware Admin – acceptă JWT de la login (user/parolă) sau cheie API legacy.
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || (req.headers.authorization && req.headers.authorization.replace(/^Bearer\s+/i, ''));

  if (key) {
    if (key.includes('.')) {
      try {
        const decoded = jwt.verify(key, config.jwt.secret);
        if (decoded && decoded.admin) return next();
      } catch (e) { /* invalid JWT */ }
    }
    if (config.adminApiKey && key === config.adminApiKey) return next();
  }

  return res.status(401).json({ error: 'Autentificare admin necesară' });
}

module.exports = { requireAdmin };
