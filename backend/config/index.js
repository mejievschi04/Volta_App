/**
 * Configurare centralizată – variabile din .env cu fallback pentru development
 */
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  env: process.env.NODE_ENV || 'development',
  isProd,

  port: parseInt(process.env.PORT, 10) || 3000,

  jwt: {
    secret: process.env.JWT_SECRET || 'volta-dev-secret-schimba-in-productie',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'volta_db',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  uploads: {
    dir: process.env.UPLOADS_DIR || 'uploads',
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },

  imageBaseUrl: process.env.IMAGE_BASE_URL || null,

  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
      : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key'],
  },

  adminApiKey: process.env.ADMIN_API_KEY || null,
};
