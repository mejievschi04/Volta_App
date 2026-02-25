/**
 * Pool PostgreSQL – singleton pentru toată aplicația
 */
const { Pool } = require('pg');
const config = require('./index');

const pool = new Pool(config.db);

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

module.exports = { pool };
