const { pool } = require('../config/database');
const { buildImageUrl } = require('../utils/buildImageUrl');
const config = require('../config');

async function list(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM blog ORDER BY created_at DESC');
    const list = result.rows.map((row) => ({
      ...row,
      image_url: buildImageUrl(row.image_url, config.port),
    }));
    res.json(list);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM blog WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Articolul nu există' });
    }
    const post = {
      ...result.rows[0],
      image_url: buildImageUrl(result.rows[0].image_url, config.port),
    };
    res.json(post);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { title, content, author, excerpt } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Titlul și conținutul sunt obligatorii' });
    }
    let imageUrl = req.file?.filename || req.body.image_url || null;
    const result = await pool.query(
      'INSERT INTO blog (title, content, image_url, author, excerpt) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [title, content, imageUrl, author || null, excerpt || null]
    );
    res.json({ success: true, id: result.rows[0].id, message: 'Articol creat cu succes' });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { title, content, author, excerpt } = req.body;
    const updates = [];
    const values = [];
    let i = 1;
    if (title) { updates.push(`title = $${i++}`); values.push(title); }
    if (content) { updates.push(`content = $${i++}`); values.push(content); }
    if (author !== undefined) { updates.push(`author = $${i++}`); values.push(author); }
    if (excerpt !== undefined) { updates.push(`excerpt = $${i++}`); values.push(excerpt); }
    if (req.file) { updates.push(`image_url = $${i++}`); values.push(req.file.filename); }
    else if (req.body.image_url) { updates.push(`image_url = $${i++}`); values.push(req.body.image_url); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nu s-a specificat niciun câmp de actualizat' });
    }
    values.push(id);
    const result = await pool.query(
      `UPDATE blog SET ${updates.join(', ')} WHERE id = $${i}`,
      values
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Articolul nu există' });
    }
    res.json({ success: true, message: 'Articol actualizat cu succes' });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM blog WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Articolul nu există' });
    }
    res.json({ success: true, message: 'Articol șters cu succes' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove };
