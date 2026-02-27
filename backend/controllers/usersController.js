const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

/** Validare telefon: cifre, opțional + la început, 8–15 caractere */
function validatePhone(telefon) {
  if (!telefon || typeof telefon !== 'string') return { valid: false, error: 'Telefonul este obligatoriu.' };
  const trimmed = telefon.trim();
  if (trimmed.length < 8 || trimmed.length > 15) {
    return { valid: false, error: 'Telefonul trebuie să aibă între 8 și 15 caractere.' };
  }
  if (!/^\+?[0-9\s\-()]+$/.test(trimmed) || trimmed.replace(/\D/g, '').length < 8) {
    return { valid: false, error: 'Telefonul trebuie să conțină doar cifre (poate începe cu +).' };
  }
  return { valid: true, value: trimmed };
}

/** Validare email opțională: dacă e prezent, trebuie să fie format valid */
function validateEmail(email) {
  if (email === undefined || email === null || email === '') return { valid: true, value: null };
  const s = String(email).trim();
  if (s === '') return { valid: true, value: null };
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(s)) {
    return { valid: false, error: 'Adresa de email nu este validă (ex: utilizator@domeniu.ro).' };
  }
  return { valid: true, value: s };
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    if (String(req.userId) !== String(id)) {
      return res.status(403).json({ error: 'Nu ai permisiunea să accesezi acest profil' });
    }
    const result = await pool.query(
      'SELECT id, nume, prenume, telefon, email, data_nasterii, sex, puncte, selected_discount_card_id FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilizatorul nu există' });
    }
    const user = result.rows[0];
    const cardsResult = await pool.query(
      'SELECT id, discount_value, expires_at, created_at FROM user_discount_cards WHERE user_id = $1 ORDER BY created_at DESC',
      [id]
    );
    const discount_cards = cardsResult.rows.map((r) => ({
      id: r.id,
      discount_value: r.discount_value,
      expires_at: r.expires_at,
      created_at: r.created_at,
    }));
    const selected = user.selected_discount_card_id != null ? user.selected_discount_card_id : null;
    res.json({ ...user, discount_cards, selected_discount_card_id: selected });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nume, u.prenume, u.telefon, u.email, u.data_nasterii, u.sex, u.puncte, u.created_at,
        (SELECT COUNT(*)::int FROM user_discount_cards c WHERE c.user_id = u.id) AS card_count
       FROM users u ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { nume, prenume, telefon, email, data_nasterii, sex, parola, puncte } = req.body;
    if (!nume || !prenume || !parola) {
      return res.status(400).json({ error: 'Nume, prenume și parolă sunt obligatorii.' });
    }
    const phoneCheck = validatePhone(telefon);
    if (!phoneCheck.valid) {
      return res.status(400).json({ error: phoneCheck.error });
    }
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ error: emailCheck.error });
    }
    if (String(parola).length < 6) {
      return res.status(400).json({ error: 'Parola trebuie să aibă minim 6 caractere.' });
    }
    const existing = await pool.query('SELECT id FROM users WHERE telefon = $1', [phoneCheck.value]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Există deja un utilizator cu acest număr de telefon.' });
    }
    const parolaHash = await bcrypt.hash(parola, 10);
    const result = await pool.query(
      'INSERT INTO users (nume, prenume, telefon, email, data_nasterii, sex, parola, puncte) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [nume.trim(), prenume.trim(), phoneCheck.value, emailCheck.value, data_nasterii || null, sex || null, parolaHash, puncte || 0]
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

    if (telefon !== undefined) {
      const phoneCheck = validatePhone(telefon);
      if (!phoneCheck.valid) return res.status(400).json({ error: phoneCheck.error });
    }
    if (email !== undefined) {
      const emailCheck = validateEmail(email);
      if (!emailCheck.valid) return res.status(400).json({ error: emailCheck.error });
    }
    if (parola !== undefined && parola !== '' && String(parola).length < 6) {
      return res.status(400).json({ error: 'Parola trebuie să aibă minim 6 caractere.' });
    }

    const updates = [];
    const values = [];
    let i = 1;
    if (nume) { updates.push(`nume = $${i++}`); values.push(nume.trim()); }
    if (prenume) { updates.push(`prenume = $${i++}`); values.push(prenume.trim()); }
    if (telefon !== undefined) {
      const phoneCheck = validatePhone(telefon);
      updates.push(`telefon = $${i++}`);
      values.push(phoneCheck.value);
    }
    if (email !== undefined) { updates.push(`email = $${i++}`); values.push(validateEmail(email).value); }
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

/**
 * Actualizare utilizator de către admin: profil (nume, prenume, telefon, email, data_nasterii, sex, parola) și/sau puncte, card reducere.
 */
async function adminUpdate(req, res, next) {
  try {
    const { id } = req.params;
    const {
      nume, prenume, telefon, email, data_nasterii, sex, parola,
      puncte, discount_card_enabled, discount_card_value, discount_card_expires_at
    } = req.body;

    if (telefon !== undefined) {
      const phoneCheck = validatePhone(telefon);
      if (!phoneCheck.valid) return res.status(400).json({ error: phoneCheck.error });
    }
    if (email !== undefined) {
      const emailCheck = validateEmail(email);
      if (!emailCheck.valid) return res.status(400).json({ error: emailCheck.error });
    }
    if (parola !== undefined && parola !== '' && String(parola).trim().length < 6) {
      return res.status(400).json({ error: 'Parola trebuie să aibă minim 6 caractere.' });
    }

    const updates = [];
    const values = [];
    let i = 1;

    if (nume !== undefined) { updates.push(`nume = $${i++}`); values.push(nume.trim()); }
    if (prenume !== undefined) { updates.push(`prenume = $${i++}`); values.push(prenume.trim()); }
    if (telefon !== undefined) {
      const phoneCheck = validatePhone(telefon);
      const existing = await pool.query('SELECT id FROM users WHERE telefon = $1 AND id != $2', [phoneCheck.value, id]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Există deja un utilizator cu acest număr de telefon.' });
      }
      updates.push(`telefon = $${i++}`);
      values.push(phoneCheck.value);
    }
    if (email !== undefined) { updates.push(`email = $${i++}`); values.push(validateEmail(email).value); }
    if (data_nasterii !== undefined) { updates.push(`data_nasterii = $${i++}`); values.push(data_nasterii); }
    if (sex !== undefined) { updates.push(`sex = $${i++}`); values.push(sex); }
    if (parola !== undefined && String(parola).trim().length >= 6) {
      const hash = await bcrypt.hash(parola, 10);
      updates.push(`parola = $${i++}`);
      values.push(hash);
    }

    if (puncte !== undefined) {
      updates.push(`puncte = $${i++}`);
      values.push(parseInt(puncte, 10) || 0);
    }
    if (discount_card_enabled !== undefined) {
      updates.push(`discount_card_enabled = $${i++}`);
      values.push(!!discount_card_enabled);
    }
    if (discount_card_value !== undefined) {
      const val = parseInt(discount_card_value, 10);
      if (val !== 5 && val !== 10) {
        return res.status(400).json({ error: 'discount_card_value trebuie să fie 5 sau 10' });
      }
      updates.push(`discount_card_value = $${i++}`);
      values.push(val);
    }
    if (discount_card_expires_at !== undefined) {
      updates.push(`discount_card_expires_at = $${i++}`);
      values.push(discount_card_expires_at || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nu s-a specificat niciun câmp de actualizat' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`,
      values
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Utilizatorul nu există' });
    }

    const updated = await pool.query(
      'SELECT id, nume, prenume, telefon, email, data_nasterii, sex, puncte, created_at FROM users WHERE id = $1',
      [id]
    );
    res.json({ success: true, user: updated.rows[0], message: 'Utilizator actualizat cu succes' });
  } catch (err) {
    next(err);
  }
}

/** Lista cardurilor de reducere ale unui user (admin). */
async function listCards(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, user_id, discount_value, expires_at, created_at FROM user_discount_cards WHERE user_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

/** Adaugă un card de reducere unui user (admin). */
async function addCard(req, res, next) {
  try {
    const { id } = req.params;
    const { discount_value, expires_at } = req.body;
    const val = parseInt(discount_value, 10);
    if (val !== 5 && val !== 10) {
      return res.status(400).json({ error: 'discount_value trebuie să fie 5 sau 10' });
    }
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Utilizatorul nu există' });
    }
    const result = await pool.query(
      'INSERT INTO user_discount_cards (user_id, discount_value, expires_at) VALUES ($1, $2, $3) RETURNING id, user_id, discount_value, expires_at, created_at',
      [id, val, expires_at ? new Date(expires_at).toISOString() : null]
    );
    res.status(201).json({ success: true, card: result.rows[0], message: 'Card adăugat' });
  } catch (err) {
    next(err);
  }
}

/** Șterge un card de reducere (admin). */
async function removeCard(req, res, next) {
  try {
    const { id, cardId } = req.params;
    await pool.query('UPDATE users SET selected_discount_card_id = NULL WHERE selected_discount_card_id = $1', [cardId]);
    const result = await pool.query(
      'DELETE FROM user_discount_cards WHERE id = $1 AND user_id = $2 RETURNING id',
      [cardId, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Cardul nu există sau nu aparține acestui utilizator' });
    }
    res.json({ success: true, message: 'Card anulat' });
  } catch (err) {
    next(err);
  }
}

/** Setează cardul selectat pentru barcode (utilizatorul propriu). */
async function setSelectedCard(req, res, next) {
  try {
    const { id } = req.params;
    if (String(req.userId) !== String(id)) {
      return res.status(403).json({ error: 'Nu ai permisiunea să modifici acest profil' });
    }
    const cardId = req.body.card_id != null ? parseInt(req.body.card_id, 10) : null;
    if (cardId !== null) {
      const cardCheck = await pool.query(
        'SELECT id FROM user_discount_cards WHERE id = $1 AND user_id = $2',
        [cardId, id]
      );
      if (cardCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Cardul nu există sau nu ți se aparține' });
      }
    }
    await pool.query('UPDATE users SET selected_discount_card_id = $1 WHERE id = $2', [cardId, id]);
    res.json({ success: true, selected_discount_card_id: cardId });
  } catch (err) {
    next(err);
  }
}

/** Înregistrare token push Expo (utilizatorul propriu) – pentru notificări push. */
async function setPushToken(req, res, next) {
  try {
    const { id } = req.params;
    if (String(req.userId) !== String(id)) {
      return res.status(403).json({ error: 'Nu ai permisiunea să modifici acest profil' });
    }
    const push_token = req.body.push_token != null ? String(req.body.push_token).trim() : null;
    await pool.query('UPDATE users SET expo_push_token = $1 WHERE id = $2', [push_token || null, id]);
    res.json({ success: true, message: 'Token push actualizat' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getById, list, create, update, remove, adminUpdate, listCards, addCard, removeCard, setSelectedCard, setPushToken };
