/**
 * Job: șterge mesajele mai vechi de 3 zile (rulează la 1h)
 */
const { pool } = require('../config/database');

async function deleteOldMessages() {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const result = await pool.query('DELETE FROM messages WHERE created_at < $1', [threeDaysAgo]);
    if (result.rowCount > 0) {
      console.log(`[Cleanup] ${result.rowCount} mesaje vechi șterse`);
    }
  } catch (err) {
    console.error('[Cleanup] Eroare:', err.message);
  }
}

function startCleanupJob() {
  const oneHour = 60 * 60 * 1000;
  setTimeout(() => {
    deleteOldMessages();
    setInterval(deleteOldMessages, oneHour);
  }, 60 * 1000);
}

module.exports = { deleteOldMessages, startCleanupJob };
