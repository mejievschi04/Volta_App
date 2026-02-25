/**
 * Log request – doar în development
 */
const config = require('../config');

function requestLogger(req, res, next) {
  if (!config.isProd) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  next();
}

module.exports = requestLogger;
