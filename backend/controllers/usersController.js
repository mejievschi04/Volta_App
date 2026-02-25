const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    if (String(req.userId) !== String(id)) {
      return res.status(403).json({ error: 'Nu ai permisiunea să accesezi acest profil' });
    }
    const result = await pool.query(
      'SELECT id, nume, prenume, telefon, email, data_nasterii, sex FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilizatorul nu există' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT id, nume, prenume, telefon, email, data_nasterii, sex, puncte, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { nume, prenume, telefon, email, data_nasterii, sex, parola, puncte } = req.body;
    if (!nume || !prenume || !telefon || !parola) {
      return res.status(400).json({ error: 'Nume, prenume, telefon și parolă sunt obligatorii' });
    }
    const existing = await pool.query('SELECT id FROM users WHERE telefon = $1', [telefon]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Utilizatorul cu acest telefon există deja' });
    }
    const parolaHash = await bcrypt.hash(parola, 10);
    const result = await pool.query(
      'INSERT INTO users (nume, prenume, telefon, email, data_nasterii, sex, parola, puncte) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [nume, prenume, telefon, email || null, data_nasterii || null, sex || null, parolaHash, puncte || 0]
    );
    res.json({ success: true, id: result.rows[0].id, message: 'Utilizator creat cu succes' });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    if (String(req.userId) !== String(id)) {
      return res.status(403).json({ error: 'Nu ai permisiunea să actualizezi acest profil' });
    }
    const { nume, prenume, telefon, email, data_nasterii, sex, parola, puncte } = req.body;

    const updates = [];
    const values = [];
    let i = 1;
    if (nume) { updates.push(`nume = $${i++}`); values.push(nume); }
    if (prenume) { updates.push(`prenume = $${i++}`); values.push(prenume); }
    if (telefon) { updates.push(`telefon = $${i++}`); values.push(telefon); }
    if (email !== undefined) { updates.push(`email = $${i++}`); values.push(email); }
    if (data_nasterii !== undefined) { updates.push(`data_nasterii = $${i++}`); values.push(data_nasterii); }
    if (sex !== undefined) { updates.push(`sex = $${i++}`); values.push(sex); }
    if (parola) {
      const hash = await bcrypt.hash(parola, 10);
      updates.push(`parola = $${i++}`);
      values.push(hash);
    }
    if (puncte !== undefined) { updates.push(`puncte = $${i++}`); values.push(puncte); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nu s-a specificat niciun câmp de actualizat' });
    }
    values.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`, values);

    const updated = await pool.query(
      'SELECT id, nume, prenume, telefon, email, data_nasterii, sex FROM users WHERE id = $1',
      [id]
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Utilizatorul nu există' });
    }
    res.json(updated.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Utilizatorul nu există' });
    }
    res.json({ success: true, message: 'Utilizator șters cu succes' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getById, list, create, update, remove };
