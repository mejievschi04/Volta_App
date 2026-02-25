const { pool } = require('../config/database');

async function list(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json(result.rows);
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
      [title, message, type || 'info']
    );
    res.json({ success: true, id: result.rows[0].id, message: 'Notificare creată cu succes' });
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
