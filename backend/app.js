/**
 * Volta Backend – aplicația Express (exportată pentru teste)
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { uploadsDir } = require('./config/multer');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors(config.cors));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Prea multe încercări de autentificare. Încearcă din nou în 15 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

app.use('/uploads', express.static(uploadsDir));

const adminPath = path.join(__dirname, 'public', 'admin');
app.use('/admin', express.static(adminPath));
app.get('/admin', (req, res) => {
  res.sendFile(path.join(adminPath, 'index.html'));
});

app.use(requestLogger);
app.use('/api', routes);

app.use((req, res) => {
  res.status(404).send('Not Found');
});
app.use(errorHandler);

module.exports = app;
