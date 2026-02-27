const { pool } = require('../config/database');
const { sendPushToTokens } = require('../lib/pushNotifications');

async function list(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
    const list = result.rows || [];
    if (process.env.NODE_ENV !== 'test') console.log('[Notifications] GET / – returning', list.length, 'items');
    res.json({ data: list });
  } catch (err) {
    next(err);
  }
}

async function listIds(req, res, next) {
  try {
    const result = await pool.query('SELECT id FROM notifications ORDER BY created_at DESC');
    res.json(result.rows.map((r) => ({ id: r.id })));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { title, message, type } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Titlul și mesajul sunt obligatorii' });
    }
    const result = await pool.query(
      'INSERT INTO notifications (title, message, type) VALUES ($1, $2, $3) RETURNING id',
      [title, message, type || 'promovare']
    );
    const notifId = result.rows[0].id;

    const tokensResult = await pool.query(
      'SELECT expo_push_token FROM users WHERE expo_push_token IS NOT NULL AND expo_push_token != \'\''
    );
    const tokens = tokensResult.rows.map((r) => r.expo_push_token).filter(Boolean);
    if (tokens.length > 0) {
      console.log('[Notifications] Notificare creată, push la', tokens.length, 'utilizator(i) cu token.');
      sendPushToTokens(tokens, title, message, { type: 'notification', id: notifId }).catch((err) =>
        console.error('[Notifications] Push send error:', err.message)
      );
    } else {
      console.log('[Notifications] Notificare creată. Niciun utilizator cu token push înregistrat – deschide aplicația, fii logat și acceptă notificările.');
    }

    res.json({ success: true, id: notifId, message: 'Notificare creată cu succes' });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { title, message, type } = req.body;
    const updates = [];
    const values = [];
    let i = 1;
    if (title) { updates.push(`title = $${i++}`); values.push(title); }
    if (message) { updates.push(`message = $${i++}`); values.push(message); }
    if (type) { updates.push(`type = $${i++}`); values.push(type); }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nu s-a specificat niciun câmp de actualizat' });
    }
    values.push(id);
    const result = await pool.query(
      `UPDATE notifications SET ${updates.join(', ')} WHERE id = $${i}`,
      values
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificarea nu există' });
    }
    res.json({ success: true, message: 'Notificare actualizată cu succes' });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificarea nu există' });
    }
    res.json({ success: true, message: 'Notificare ștearsă cu succes' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, listIds, create, update, remove };
