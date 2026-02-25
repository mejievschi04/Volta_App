/**
 * Middleware global de eroare – loghează și răspunde cu JSON
 */
const config = require('../config');

function errorHandler(err, req, res, next) {
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Eroare internă a serverului';

  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 400;
    message = 'Fișierul este prea mare. Maxim 10MB.';
  }
  if (err.message && err.message.includes('Doar fișiere imagine')) {
    status = 400;
  }

  if (!config.isProd) {
    console.error('[Error]', err.stack || err);
  } else {
    console.error('[Error]', status, message);
  }

  res.status(status).json({
    error: status === 500 && config.isProd ? 'Eroare internă a serverului' : message,
  });
}

module.exports = errorHandler;
