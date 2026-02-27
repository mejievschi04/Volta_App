/**
 * Coloană expo_push_token pe users – pentru notificări push.
 */
const { pool } = require('../config/database');

async function runPushTokenMigration() {
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR(500) NULL
    `);
    console.log('   Migrare: expo_push_token pe users – OK');
  } catch (err) {
    console.error('   Migrare push_token:', err.message);
  }
}

module.exports = { runPushTokenMigration };
