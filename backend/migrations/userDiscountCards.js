/**
 * Tabel user_discount_cards – mai multe carduri de reducere per user.
 */
const { pool } = require('../config/database');

async function runUserDiscountCardsMigration() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_discount_cards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        discount_value INTEGER NOT NULL CHECK (discount_value IN (5, 10)),
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_discount_cards_user_id ON user_discount_cards(user_id)`);
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_discount_card_id INTEGER NULL
    `);
    console.log('   Migrare: tabel user_discount_cards + selected_discount_card_id – OK');
  } catch (err) {
    console.error('   Migrare user_discount_cards:', err.message);
  }
}

module.exports = { runUserDiscountCardsMigration };
