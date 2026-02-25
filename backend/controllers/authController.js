const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const config = require('../config');

async function login(req, res, next) {
  try {
    const { telefon, parola } = req.body;
    if (!telefon || !parola) {
      return res.status(400).json({ error: 'Telefon și parolă sunt obligatorii' });
    }

    const result = await pool.query(
      'SELECT id, nume, prenume, telefon, email, parola, data_nasterii, sex FROM users WHERE telefon = $1',
      [telefon]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilizatorul nu există' });
    }

    const user = result.rows[0];
    const parolaMatch = user.parola && user.parola.startsWith('$2')
      ? await bcrypt.compare(parola, user.parola)
      : user.parola === parola;
    if (!parolaMatch) {
      return res.status(401).json({ error: 'Parolă incorectă' });
    }

    delete user.parola;
    const token = jwt.sign({ userId: user.id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
}

async function signup(req, res, next) {
  try {
    const { nume, prenume, telefon, data_nasterii, sex, parola } = req.body;
    if (!nume || !prenume || !telefon || !parola) {
      return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE telefon = $1', [telefon]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Utilizatorul există deja' });
    }

    const parolaHash = await bcrypt.hash(parola, 10);
    const result = await pool.query(
      'INSERT INTO users (nume, prenume, telefon, data_nasterii, sex, parola) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [nume, prenume, telefon, data_nasterii || null, sex || null, parolaHash]
    );
    const newUser = await pool.query(
      'SELECT id, nume, prenume, telefon, email, data_nasterii, sex FROM users WHERE id = $1',
      [result.rows[0].id]
    );
    const token = jwt.sign({ userId: newUser.rows[0].id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    res.status(201).json({ user: newUser.rows[0], token });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, signup };
