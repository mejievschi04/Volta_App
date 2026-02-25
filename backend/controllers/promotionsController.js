const { pool } = require('../config/database');
const { buildImageUrl } = require('../utils/buildImageUrl');
const config = require('../config');

/**
 * List: toate promoțiile sau doar cele pentru carousel home (?home=1).
 * O promoție are 2 imagini: image (pagina Promoții), image_home (carousel Home).
 */
async function list(req, res, next) {
  try {
    const homeOnly = req.query.home === '1' || req.query.home === 'true';
    const port = config.port;

    if (homeOnly) {
      const result = await pool.query(
        `SELECT id, title, image_home as image_url, link, deadline, created_at 
         FROM promotions 
         WHERE image_home IS NOT NULL AND image_home != '' 
         ORDER BY created_at DESC`
      );
      const list = result.rows.map((row) => ({
        ...row,
        image_url: buildImageUrl(row.image_url, port),
      }));
      return res.json(list);
    }

    const result = await pool.query(
      'SELECT id, title, image, image_home, deadline, link, created_at FROM promotions ORDER BY created_at DESC'
    );
    const list = result.rows.map((row) => ({
      ...row,
      image_url: buildImageUrl(row.image, config.port),
      image_home_url: buildImageUrl(row.image_home, config.port),
    }));
    res.json(list);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, title, image, image_home, deadline, link, created_at FROM promotions WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Promoția nu există' });
    }
    const row = result.rows[0];
    res.json({
      ...row,
      image_url: buildImageUrl(row.image, config.port),
      image_home_url: buildImageUrl(row.image_home, config.port),
    });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { title, deadline, link } = req.body;
    if (!title || !deadline) {
      return res.status(400).json({ error: 'Titlul și data limită sunt obligatorii' });
    }
    let image = null;
    let imageHome = null;
    if (req.files?.image?.[0]) image = req.files.image[0].filename;
    else if (req.body.image) image = req.body.image;
    if (req.files?.image_home?.[0]) imageHome = req.files.image_home[0].filename;
    else if (req.body.image_home) imageHome = req.body.image_home;

    const result = await pool.query(
      'INSERT INTO promotions (title, image, deadline, link, image_home) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [title, image, deadline, link || null, imageHome]
    );
    res.json({ success: true, id: result.rows[0].id, message: 'Promoție creată cu succes' });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { title, deadline, link } = req.body;
    const updates = [];
    const values = [];
    let i = 1;
    if (title) { updates.push(`title = $${i++}`); values.push(title); }
    if (deadline) { updates.push(`deadline = $${i++}`); values.push(deadline); }
    if (link !== undefined) { updates.push(`link = $${i++}`); values.push(link); }
    if (req.files?.image?.[0]) { updates.push(`image = $${i++}`); values.push(req.files.image[0].filename); }
    else if (req.body.image !== undefined) { updates.push(`image = $${i++}`); values.push(req.body.image || null); }
    if (req.files?.image_home?.[0]) { updates.push(`image_home = $${i++}`); values.push(req.files.image_home[0].filename); }
    else if (req.body.image_home !== undefined) { updates.push(`image_home = $${i++}`); values.push(req.body.image_home || null); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nu s-a specificat niciun câmp de actualizat' });
    }
    values.push(id);
    const result = await pool.query(
      `UPDATE promotions SET ${updates.join(', ')} WHERE id = $${i}`,
      values
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Promoția nu există' });
    }
    res.json({ success: true, message: 'Promoție actualizată cu succes' });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM promotions WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Promoția nu există' });
    }
    res.json({ success: true, message: 'Promoție ștearsă cu succes' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
