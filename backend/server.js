/**
 * Volta Backend – punctul de intrare
 */
require('dotenv').config();
const app = require('./app');
const config = require('./config');
const { pool } = require('./config/database');
const { startCleanupJob } = require('./jobs/deleteOldMessages');
const { runDiscountCardMigration } = require('./migrations/discountCard');
const { runUserDiscountCardsMigration } = require('./migrations/userDiscountCards');
const { runPushTokenMigration } = require('./migrations/pushToken');

// Test conexiune PostgreSQL + migrări
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ PostgreSQL conectat');
    console.log(`   DB: ${config.db.database} @ ${config.db.host}:${config.db.port}`);
    return runDiscountCardMigration();
  })
  .then(() => runUserDiscountCardsMigration())
  .then(() => runPushTokenMigration())
  .catch((err) => {
    console.error('❌ PostgreSQL:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('   Verifică că PostgreSQL rulează și .env (DB_*).');
    }
  });

startCleanupJob();

const PORT = config.port;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server: http://localhost:${PORT}`);
  console.log(`   API:    http://localhost:${PORT}/api`);
  console.log(`   Admin:  http://localhost:${PORT}/admin`);
  console.log(`   Uploads: /uploads\n`);
});
