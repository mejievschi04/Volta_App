const { pool } = require('../config/database');

async function list(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT m.*, u.telefon, u.nume, u.prenume, u.email
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function getByUserId(req, res, next) {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM messages WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(500).json({
        error: 'Tabelul messages nu există. Rulează scriptul SQL pentru a crea tabelul.',
      });
    }
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { user_id, message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Mesajul este obligatoriu' });
    }
    const userId = user_id || null;

    const result = await pool.query(
      'INSERT INTO messages (user_id, message, is_from_admin, "read") VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, message.trim(), false, false]
    );

    if (userId) {
      const existing = await pool.query(
        'SELECT COUNT(*) as count FROM messages WHERE user_id = $1 AND is_from_admin = FALSE',
        [userId]
      );
      const isFirstMessage = parseInt(existing.rows[0].count, 10) === 1;
      if (isFirstMessage) {
        const userRows = await pool.query('SELECT prenume, nume FROM users WHERE id = $1', [userId]);
        const userName = userRows.rows[0]?.prenume || userRows.rows[0]?.nume || '';
        const welcome = userName
          ? `Salut, ${userName}! Vă mulțumim pentru mesaj. Echipa noastră vă va răspunde în cel mai scurt timp.`
          : 'Salut! Vă mulțumim pentru mesaj. Echipa noastră vă va răspunde în cel mai scurt timp.';
        await pool.query(
          'INSERT INTO messages (user_id, message, is_from_admin, "read") VALUES ($1, $2, $3, $4)',
          [userId, welcome, true, false]
        );
      }
    }

    res.json({ success: true, id: result.rows[0].id, message: 'Mesaj trimis cu succes' });
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(500).json({ error: 'Tabelul messages nu există. Rulează scriptul SQL.' });
    }
    if (err.code === '23503' || err.code === '23504') {
      return res.status(400).json({ error: 'ID-ul utilizatorului nu este valid' });
    }
    next(err);
  }
}

async function reply(req, res, next) {
  try {
    const { user_id, message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Mesajul este obligatoriu' });
    }
    if (!user_id) {
      return res.status(400).json({ error: 'ID-ul utilizatorului este obligatoriu' });
    }
    const result = await pool.query(
      'INSERT INTO messages (user_id, message, is_from_admin, "read") VALUES ($1, $2, $3, $4) RETURNING id',
      [user_id, message.trim(), true, false]
    );
    res.json({ success: true, id: result.rows[0].id, message: 'Răspuns trimis cu succes' });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const { user_id, message_ids } = req.body;
    if (!user_id && !message_ids) {
      return res.status(400).json({ error: 'Furnizează user_id sau message_ids' });
    }
    if (user_id) {
      await pool.query(
        'UPDATE messages SET "read" = TRUE WHERE user_id = $1 AND is_from_admin = FALSE AND "read" = FALSE',
        [user_id]
      );
    } else if (Array.isArray(message_ids) && message_ids.length) {
      const placeholders = message_ids.map((_, idx) => `$${idx + 1}`).join(',');
      await pool.query(
        `UPDATE messages SET "read" = TRUE WHERE id IN (${placeholders}) AND is_from_admin = FALSE`,
        message_ids
      );
    }
    res.json({ success: true, message: 'Mesajele au fost marcate ca citite' });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM messages WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Mesajul nu există' });
    }
    res.json({ success: true, message: 'Mesaj șters cu succes' });
  } catch (err) {
    next(err);
  }
}

async function removeThread(req, res, next) {
  try {
    const { userId } = req.params;
    const result = await pool.query('DELETE FROM messages WHERE user_id = $1', [userId]);
    res.json({
      success: true,
      message: `Conversația ștearsă (${result.rowCount} mesaje)`,
      deletedCount: result.rowCount,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getByUserId,
  create,
  reply,
  markRead,
  remove,
  removeThread,
};
