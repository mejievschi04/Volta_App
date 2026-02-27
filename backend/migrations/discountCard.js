/**
 * Migrare: coloane pentru card reducere pe users.
 * Rulează la pornire; nu eșuează dacă coloanele există deja.
 */
const { pool } = require('../config/database');

const MIGRATIONS = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS discount_card_enabled BOOLEAN DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS discount_card_value INTEGER DEFAULT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS discount_card_expires_at TIMESTAMP NULL`,
];

async function runDiscountCardMigration() {
  try {
    for (const sql of MIGRATIONS) {
      await pool.query(sql);
    }
    console.log('   Migrare: coloane card reducere (users) – OK');
  } catch (err) {
    console.error('   Migrare card reducere:', err.message);
  }
}

module.exports = { runDiscountCardMigration };
