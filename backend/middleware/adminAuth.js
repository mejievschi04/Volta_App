/**
 * Middleware Admin – verifică X-Admin-Key pentru rutele de administrare.
 * Dacă ADMIN_API_KEY nu e setat în .env (dev), rutele sunt deschise.
 */
const config = require('../config');

function requireAdmin(req, res, next) {
  if (!config.adminApiKey) {
    return next();
  }
  const key = req.headers['x-admin-key'];
  if (key === config.adminApiKey) {
    return next();
  }
  return res.status(401).json({ error: 'Admin key lipsă sau invalidă' });
}

module.exports = { requireAdmin };
