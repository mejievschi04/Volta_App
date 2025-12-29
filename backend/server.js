const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Folosește folderul uploads local (în proiectul backend)
const uploadsDir = path.join(__dirname, 'uploads');

// Creează folderul uploads dacă nu există
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Folder uploads local creat:', uploadsDir);
} else {
  console.log('📁 Folosind folderul uploads local:', uploadsDir);
}

// Middleware
app.use(cors({
  origin: '*', // Permite toate originile (pentru development)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generează un nume unic pentru fișier
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// Configure multer for multiple files
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Acceptă doar imagini
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Doar fișiere imagine sunt permise!'));
    }
  }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Logging middleware pentru debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'volta_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('✅ Conectat la MySQL!');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Eroare la conectare MySQL:', err.message);
  });

// ============ USER ENDPOINTS ============

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { telefon, parola } = req.body;
    
    if (!telefon || !parola) {
      return res.status(400).json({ error: 'Telefon și parolă sunt obligatorii' });
    }

    const [rows] = await pool.execute(
      'SELECT id, nume, prenume, telefon, email, parola, data_nasterii, sex FROM users WHERE telefon = ?',
      [telefon]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Utilizatorul nu există' });
    }

    const user = rows[0];
    
    if (user.parola !== parola) {
      return res.status(401).json({ error: 'Parolă incorectă' });
    }

    // Remove password from response
    delete user.parola;
    res.json(user);
  } catch (error) {
    console.error('Eroare login:', error);
    res.status(500).json({ error: 'Eroare la autentificare' });
  }
});

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { nume, prenume, telefon, data_nasterii, sex, parola } = req.body;
    
    if (!nume || !prenume || !telefon || !parola) {
      return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii' });
    }

    // Check if user already exists
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE telefon = ?',
      [telefon]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Utilizatorul există deja' });
    }

    const [result] = await pool.execute(
      'INSERT INTO users (nume, prenume, telefon, data_nasterii, sex, parola) VALUES (?, ?, ?, ?, ?, ?)',
      [nume, prenume, telefon, data_nasterii || null, sex || null, parola]
    );

    const [newUser] = await pool.execute(
      'SELECT id, nume, prenume, telefon, email, data_nasterii, sex FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error('Eroare signup:', error);
    res.status(500).json({ error: 'Eroare la înregistrare' });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.execute(
      'SELECT id, nume, prenume, telefon, email, parola FROM users WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Utilizatorul nu există' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Eroare get user:', error);
    res.status(500).json({ error: 'Eroare la preluarea utilizatorului' });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nume, prenume, email, parola } = req.body;
    
    const updates = {};
    if (nume !== undefined) updates.nume = nume;
    if (prenume !== undefined) updates.prenume = prenume;
    if (email !== undefined) updates.email = email;
    if (parola !== undefined) updates.parola = parola;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nu există date de actualizat' });
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    await pool.execute(
      `UPDATE users SET ${setClause} WHERE id = ?`,
      values
    );

    const [updated] = await pool.execute(
      'SELECT id, nume, prenume, telefon, email, data_nasterii, sex FROM users WHERE id = ?',
      [id]
    );

    res.json(updated[0]);
  } catch (error) {
    console.error('Eroare update user:', error);
    res.status(500).json({ error: 'Eroare la actualizarea utilizatorului' });
  }
});

// ============ NOTIFICATIONS ENDPOINTS ============

// Get all notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM notifications ORDER BY created_at DESC'
    );

    res.json(rows);
  } catch (error) {
    console.error('Eroare get notifications:', error);
    res.status(500).json({ error: 'Eroare la preluarea notificărilor' });
  }
});

// Get notification IDs only
app.get('/api/notifications/ids', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id FROM notifications ORDER BY created_at DESC'
    );

    res.json(rows.map(r => ({ id: r.id })));
  } catch (error) {
    console.error('Eroare get notification IDs:', error);
    res.status(500).json({ error: 'Eroare la preluarea ID-urilor' });
  }
});

// ============ PROMOTIONS ENDPOINTS ============

// Helper function to build full image URL
function buildImageUrl(imagePath, req = null) {
  if (!imagePath) {
    console.log('[buildImageUrl] imagePath este null sau undefined');
    return null;
  }
  
  console.log('[buildImageUrl] Original imagePath:', imagePath);
  
  // Dacă este deja un URL complet (http/https), returnează-l așa
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    console.log('[buildImageUrl] Este deja un URL complet, returnăm:', imagePath);
    return imagePath;
  }
  
  // Dacă este un path relativ, construiește URL-ul complet
  // Elimină "uploads/" dacă există deja în path
  let cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  if (cleanPath.startsWith('uploads/')) {
    cleanPath = cleanPath.replace('uploads/', '');
  }
  
  console.log('[buildImageUrl] cleanPath:', cleanPath);
  
  // Folosește IP-ul local pentru a fi accesibil din app-ul React Native
  // Poți seta IMAGE_BASE_URL în .env pentru a forța un IP specific
  let baseUrl;
  if (process.env.IMAGE_BASE_URL) {
    baseUrl = process.env.IMAGE_BASE_URL;
  } else {
    // Folosește IP-ul local (același ca în apiClient.ts)
    // Pentru Android emulator și dispozitive fizice
    baseUrl = `http://192.168.0.148:${PORT}`;
  }
  
  const fullUrl = `${baseUrl}/uploads/${cleanPath}`;
  console.log('[buildImageUrl] URL final construit:', fullUrl);
  
  return fullUrl;
}

// Get promotions for home (promotions_home table)
app.get('/api/promotions/home', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, title, image_url, link, deadline, created_at FROM promotions_home ORDER BY created_at DESC'
    );

    // Construiește URL-uri complete pentru imagini
    const promotions = rows.map(row => ({
      ...row,
      image_url: buildImageUrl(row.image_url, req)
    }));

    res.json(promotions);
  } catch (error) {
    console.error('Eroare get promotions home:', error);
    res.status(500).json({ error: 'Eroare la preluarea promoțiilor' });
  }
});

// Get all promotions (promotions table)
app.get('/api/promotions', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, title, image as image_url, image_home, deadline, link, created_at FROM promotions ORDER BY created_at DESC'
    );

    // Construiește URL-uri complete pentru imagini
    const promotions = rows.map(row => ({
      ...row,
      image_url: buildImageUrl(row.image_url, req),
      image_home_url: buildImageUrl(row.image_home, req)
    }));

    res.json(promotions);
  } catch (error) {
    console.error('Eroare get promotions:', error);
    res.status(500).json({ error: 'Eroare la preluarea promoțiilor' });
  }
});

// ============ BLOG ENDPOINTS ============

// Get all blog posts
app.get('/api/blog', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM blog ORDER BY created_at DESC'
    );

    // Construiește URL-uri complete pentru imagini
    const posts = rows.map(row => ({
      ...row,
      image_url: buildImageUrl(row.image_url, req)
    }));

    res.json(posts);
  } catch (error) {
    console.error('Eroare get blog:', error);
    res.status(500).json({ error: 'Eroare la preluarea articolelor' });
  }
});

// Get blog post by ID
app.get('/api/blog/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.execute(
      'SELECT * FROM blog WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Articolul nu există' });
    }

    // Construiește URL complet pentru imagine
    const post = {
      ...rows[0],
      image_url: buildImageUrl(rows[0].image_url, req)
    };

    res.json(post);
  } catch (error) {
    console.error('Eroare get blog post:', error);
    res.status(500).json({ error: 'Eroare la preluarea articolului' });
  }
});

// Create blog post with image
app.post('/api/blog', upload.single('image'), async (req, res) => {
  try {
    const { title, content, author, excerpt } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Titlul și conținutul sunt obligatorii' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = req.file.filename;
    } else if (req.body.image_url) {
      imageUrl = req.body.image_url;
    }

    const [result] = await pool.execute(
      'INSERT INTO blog (title, content, image_url, author, excerpt) VALUES (?, ?, ?, ?, ?)',
      [title, content, imageUrl, author || null, excerpt || null]
    );

    res.json({
      success: true,
      id: result.insertId,
      message: 'Articol creat cu succes'
    });
  } catch (error) {
    console.error('Eroare creare articol blog:', error);
    res.status(500).json({ error: 'Eroare la crearea articolului' });
  }
});

// Update blog post with image
app.put('/api/blog/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, author, excerpt } = req.body;

    let updateFields = [];
    let values = [];

    if (title) {
      updateFields.push('title = ?');
      values.push(title);
    }
    if (content) {
      updateFields.push('content = ?');
      values.push(content);
    }
    if (author !== undefined) {
      updateFields.push('author = ?');
      values.push(author);
    }
    if (excerpt !== undefined) {
      updateFields.push('excerpt = ?');
      values.push(excerpt);
    }
    
    if (req.file) {
      updateFields.push('image_url = ?');
      values.push(req.file.filename);
    } else if (req.body.image_url) {
      updateFields.push('image_url = ?');
      values.push(req.body.image_url);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nu s-a specificat niciun câmp de actualizat' });
    }

    values.push(id);

    const [result] = await pool.execute(
      `UPDATE blog SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Articolul nu există' });
    }

    res.json({
      success: true,
      message: 'Articol actualizat cu succes'
    });
  } catch (error) {
    console.error('Eroare actualizare articol blog:', error);
    res.status(500).json({ error: 'Eroare la actualizarea articolului' });
  }
});

// Delete blog post
app.delete('/api/blog/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM blog WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Articolul nu există' });
    }

    res.json({
      success: true,
      message: 'Articol șters cu succes'
    });
  } catch (error) {
    console.error('Eroare ștergere articol blog:', error);
    res.status(500).json({ error: 'Eroare la ștergerea articolului' });
  }
});

// ============ UPLOAD ENDPOINTS ============

// Upload image endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nu s-a încărcat niciun fișier' });
    }

    const imageUrl = req.file.filename;
    const fullUrl = buildImageUrl(imageUrl, req);
    
    console.log('📸 Imagine încărcată:', imageUrl);
    
    res.json({
      success: true,
      filename: imageUrl,
      url: fullUrl
    });
  } catch (error) {
    console.error('Eroare upload imagine:', error);
    res.status(500).json({ error: 'Eroare la încărcarea imaginii' });
  }
});

// Create promotion with image
app.post('/api/promotions', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'image_home', maxCount: 1 }]), async (req, res) => {
  try {
    const { title, deadline, link } = req.body;
    
    if (!title || !deadline) {
      return res.status(400).json({ error: 'Titlul și data limită sunt obligatorii' });
    }

    let imageUrl = null;
    let imageHomeUrl = null;

    // Image for promotions page
    if (req.files && req.files.image && req.files.image[0]) {
      imageUrl = req.files.image[0].filename;
    } else if (req.body.image_url) {
      imageUrl = req.body.image_url;
    }

    // Image for home page
    if (req.files && req.files.image_home && req.files.image_home[0]) {
      imageHomeUrl = req.files.image_home[0].filename;
    } else if (req.body.image_home_url) {
      imageHomeUrl = req.body.image_home_url;
    }

    const [result] = await pool.execute(
      'INSERT INTO promotions (title, image, deadline, link, image_home) VALUES (?, ?, ?, ?, ?)',
      [title, imageUrl, deadline, link || null, imageHomeUrl]
    );

    res.json({
      success: true,
      id: result.insertId,
      message: 'Promoție creată cu succes'
    });
  } catch (error) {
    console.error('Eroare creare promoție:', error);
    res.status(500).json({ error: 'Eroare la crearea promoției' });
  }
});

// Create promotion for home with image
app.post('/api/promotions/home', upload.single('image'), async (req, res) => {
  try {
    const { title, deadline, link } = req.body;
    
    if (!title || !deadline) {
      return res.status(400).json({ error: 'Titlul și data limită sunt obligatorii' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = req.file.filename;
    } else if (req.body.image_url) {
      imageUrl = req.body.image_url;
    }

    const [result] = await pool.execute(
      'INSERT INTO promotions_home (title, image_url, deadline, link) VALUES (?, ?, ?, ?)',
      [title, imageUrl, deadline, link || null]
    );

    res.json({
      success: true,
      id: result.insertId,
      message: 'Promoție pentru home creată cu succes'
    });
  } catch (error) {
    console.error('Eroare creare promoție home:', error);
    res.status(500).json({ error: 'Eroare la crearea promoției pentru home' });
  }
});

// Update promotion with image
app.put('/api/promotions/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'image_home', maxCount: 1 }]), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, deadline, link } = req.body;

    let updateFields = [];
    let values = [];

    if (title) {
      updateFields.push('title = ?');
      values.push(title);
    }
    if (deadline) {
      updateFields.push('deadline = ?');
      values.push(deadline);
    }
    if (link !== undefined) {
      updateFields.push('link = ?');
      values.push(link);
    }
    
    // Image for promotions page
    if (req.files && req.files.image && req.files.image[0]) {
      updateFields.push('image = ?');
      values.push(req.files.image[0].filename);
    } else if (req.body.image_url) {
      updateFields.push('image = ?');
      values.push(req.body.image_url);
    }
    
    // Image for home page
    if (req.files && req.files.image_home && req.files.image_home[0]) {
      updateFields.push('image_home = ?');
      values.push(req.files.image_home[0].filename);
    } else if (req.body.image_home_url) {
      updateFields.push('image_home = ?');
      values.push(req.body.image_home_url);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nu s-a specificat niciun câmp de actualizat' });
    }

    values.push(id);

    const [result] = await pool.execute(
      `UPDATE promotions SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Promoția nu există' });
    }

    res.json({
      success: true,
      message: 'Promoție actualizată cu succes'
    });
  } catch (error) {
    console.error('Eroare actualizare promoție:', error);
    res.status(500).json({ error: 'Eroare la actualizarea promoției' });
  }
});

// Delete promotion
app.delete('/api/promotions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM promotions WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Promoția nu există' });
    }

    res.json({
      success: true,
      message: 'Promoție ștearsă cu succes'
    });
  } catch (error) {
    console.error('Eroare ștergere promoție:', error);
    res.status(500).json({ error: 'Eroare la ștergerea promoției' });
  }
});

// Delete promotion from home
app.delete('/api/promotions/home/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM promotions_home WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Promoția nu există' });
    }

    res.json({
      success: true,
      message: 'Promoție ștearsă cu succes'
    });
  } catch (error) {
    console.error('Eroare ștergere promoție home:', error);
    res.status(500).json({ error: 'Eroare la ștergerea promoției' });
  }
});

// ============ USER MANAGEMENT ENDPOINTS ============

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, nume, prenume, telefon, email, data_nasterii, sex, puncte, created_at FROM users ORDER BY created_at DESC'
    );

    res.json(rows);
  } catch (error) {
    console.error('Eroare get users:', error);
    res.status(500).json({ error: 'Eroare la preluarea utilizatorilor' });
  }
});

// Create user (admin)
app.post('/api/users', async (req, res) => {
  try {
    const { nume, prenume, telefon, email, data_nasterii, sex, parola, puncte } = req.body;
    
    if (!nume || !prenume || !telefon || !parola) {
      return res.status(400).json({ error: 'Nume, prenume, telefon și parolă sunt obligatorii' });
    }

    // Check if user already exists
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE telefon = ?',
      [telefon]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Utilizatorul cu acest telefon există deja' });
    }

    const [result] = await pool.execute(
      'INSERT INTO users (nume, prenume, telefon, email, data_nasterii, sex, parola, puncte) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nume, prenume, telefon, email || null, data_nasterii || null, sex || null, parola, puncte || 0]
    );

    res.json({
      success: true,
      id: result.insertId,
      message: 'Utilizator creat cu succes'
    });
  } catch (error) {
    console.error('Eroare creare utilizator:', error);
    res.status(500).json({ error: 'Eroare la crearea utilizatorului' });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Utilizatorul nu există' });
    }

    res.json({
      success: true,
      message: 'Utilizator șters cu succes'
    });
  } catch (error) {
    console.error('Eroare ștergere utilizator:', error);
    res.status(500).json({ error: 'Eroare la ștergerea utilizatorului' });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nume, prenume, telefon, email, data_nasterii, sex, parola, puncte } = req.body;

    let updateFields = [];
    let values = [];

    if (nume) {
      updateFields.push('nume = ?');
      values.push(nume);
    }
    if (prenume) {
      updateFields.push('prenume = ?');
      values.push(prenume);
    }
    if (telefon) {
      updateFields.push('telefon = ?');
      values.push(telefon);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      values.push(email);
    }
    if (data_nasterii !== undefined) {
      updateFields.push('data_nasterii = ?');
      values.push(data_nasterii);
    }
    if (sex !== undefined) {
      updateFields.push('sex = ?');
      values.push(sex);
    }
    if (parola) {
      updateFields.push('parola = ?');
      values.push(parola);
    }
    if (puncte !== undefined) {
      updateFields.push('puncte = ?');
      values.push(puncte);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nu s-a specificat niciun câmp de actualizat' });
    }

    values.push(id);

    const [result] = await pool.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Utilizatorul nu există' });
    }

    res.json({
      success: true,
      message: 'Utilizator actualizat cu succes'
    });
  } catch (error) {
    console.error('Eroare actualizare utilizator:', error);
    res.status(500).json({ error: 'Eroare la actualizarea utilizatorului' });
  }
});

// ============ NOTIFICATIONS ENDPOINTS ============

// Get all notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM notifications ORDER BY created_at DESC'
    );

    res.json(rows);
  } catch (error) {
    console.error('Eroare get notifications:', error);
    res.status(500).json({ error: 'Eroare la preluarea notificărilor' });
  }
});

// Create notification
app.post('/api/notifications', async (req, res) => {
  try {
    const { title, message, type } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Titlul și mesajul sunt obligatorii' });
    }

    const [result] = await pool.execute(
      'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
      [title, message, type || 'info']
    );

    res.json({
      success: true,
      id: result.insertId,
      message: 'Notificare creată cu succes'
    });
  } catch (error) {
    console.error('Eroare creare notificare:', error);
    res.status(500).json({ error: 'Eroare la crearea notificării' });
  }
});

// Delete notification
app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM notifications WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notificarea nu există' });
    }

    res.json({
      success: true,
      message: 'Notificare ștearsă cu succes'
    });
  } catch (error) {
    console.error('Eroare ștergere notificare:', error);
    res.status(500).json({ error: 'Eroare la ștergerea notificării' });
  }
});

// Update notification
app.put('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, type } = req.body;

    let updateFields = [];
    let values = [];

    if (title) {
      updateFields.push('title = ?');
      values.push(title);
    }
    if (message) {
      updateFields.push('message = ?');
      values.push(message);
    }
    if (type) {
      updateFields.push('type = ?');
      values.push(type);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nu s-a specificat niciun câmp de actualizat' });
    }

    values.push(id);

    const [result] = await pool.execute(
      `UPDATE notifications SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notificarea nu există' });
    }

    res.json({
      success: true,
      message: 'Notificare actualizată cu succes'
    });
  } catch (error) {
    console.error('Eroare actualizare notificare:', error);
    res.status(500).json({ error: 'Eroare la actualizarea notificării' });
  }
});

// ============ MESSAGES ENDPOINTS ============

// Get all messages (for admin)
app.get('/api/messages', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT m.*, u.telefon, u.nume, u.prenume, u.email
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Eroare get messages:', error);
    res.status(500).json({ error: 'Eroare la preluarea mesajelor' });
  }
});

// Get messages for a specific user (for mobile app)
app.get('/api/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[API] GET /api/messages/:userId - userId:', userId);
    
    // Verifică dacă tabelul există
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM messages WHERE user_id = ? ORDER BY created_at ASC',
        [userId]
      );
      console.log('[API] Mesaje găsite:', rows.length);
      res.json(rows);
    } catch (dbError) {
      console.error('[API] Eroare la query:', dbError);
      
      // Verifică dacă tabelul nu există
      if (dbError.code === 'ER_NO_SUCH_TABLE') {
        return res.status(500).json({ 
          error: 'Tabelul messages nu există. Te rugăm să rulezi script-ul SQL pentru a crea tabelul.' 
        });
      }
      
      throw dbError;
    }
  } catch (error) {
    console.error('[API] Eroare get user messages:', error);
    const errorMessage = error && error.message ? error.message : 'Eroare necunoscută';
    res.status(500).json({ 
      error: `Eroare la preluarea mesajelor utilizatorului: ${errorMessage}` 
    });
  }
});

// Create message (from user)
app.post('/api/messages', async (req, res) => {
  try {
    const { user_id, message } = req.body;
    console.log('[API] POST /api/messages - Body:', { user_id, message });
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Mesajul este obligatoriu' });
    }

    // Dacă nu există user_id, creăm un mesaj anonim sau folosim null
    const userId = user_id || null;

    // Verifică dacă tabelul există înainte de insert
    try {
      // Verifică dacă este primul mesaj al utilizatorului
      let isFirstMessage = false;
      if (userId) {
        const [existingMessages] = await pool.execute(
          'SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND is_from_admin = FALSE',
          [userId]
        );
        isFirstMessage = existingMessages[0].count === 0;
      }

      const [result] = await pool.execute(
        'INSERT INTO messages (user_id, message, is_from_admin, `read`) VALUES (?, ?, ?, ?)',
        [userId, message.trim(), false, false]
      );

      console.log('[API] Mesaj inserat cu succes:', result.insertId);

      // Dacă este primul mesaj, trimite automat un mesaj de bun venit
      if (isFirstMessage && userId) {
        try {
          // Obține numele utilizatorului
          const [userRows] = await pool.execute(
            'SELECT prenume, nume FROM users WHERE id = ?',
            [userId]
          );
          
          let userName = '';
          if (userRows && userRows.length > 0) {
            const user = userRows[0];
            // Folosește prenume dacă există, altfel nume, altfel "utilizator"
            userName = user.prenume || user.nume || '';
          }
          
          const welcomeMessage = userName 
            ? `Salut, ${userName}! Vă mulțumim pentru mesaj. Echipa noastră vă va răspunde în cel mai scurt timp.`
            : 'Salut! Vă mulțumim pentru mesaj. Echipa noastră vă va răspunde în cel mai scurt timp.';
          
          await pool.execute(
            'INSERT INTO messages (user_id, message, is_from_admin, `read`) VALUES (?, ?, ?, ?)',
            [userId, welcomeMessage, true, false]
          );
          console.log('[API] Mesaj de bun venit trimis automat pentru utilizatorul:', userId);
        } catch (welcomeError) {
          console.error('[API] Eroare la trimiterea mesajului de bun venit:', welcomeError);
          // Nu întrerupem răspunsul dacă mesajul de bun venit eșuează
        }
      }

      res.json({
        success: true,
        id: result.insertId,
        message: 'Mesaj trimis cu succes'
      });
    } catch (dbError) {
      console.error('[API] Eroare la inserarea în baza de date:', dbError);
      
      // Verifică dacă tabelul nu există
      if (dbError.code === 'ER_NO_SUCH_TABLE') {
        return res.status(500).json({ 
          error: 'Tabelul messages nu există. Te rugăm să rulezi script-ul SQL pentru a crea tabelul.' 
        });
      }
      
      // Verifică dacă există o problemă cu foreign key
      if (dbError.code === 'ER_NO_REFERENCED_ROW_2' || dbError.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({ 
          error: 'ID-ul utilizatorului nu este valid' 
        });
      }
      
      throw dbError;
    }
  } catch (error) {
    console.error('[API] Eroare creare mesaj:', error);
    const errorMessage = error && error.message ? error.message : 'Eroare necunoscută';
    res.status(500).json({ 
      error: `Eroare la trimiterea mesajului: ${errorMessage}` 
    });
  }
});

// Reply to message (from admin)
app.post('/api/messages/reply', async (req, res) => {
  try {
    const { user_id, message } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Mesajul este obligatoriu' });
    }

    if (!user_id) {
      return res.status(400).json({ error: 'ID-ul utilizatorului este obligatoriu' });
    }

    const [result] = await pool.execute(
      'INSERT INTO messages (user_id, message, is_from_admin, `read`) VALUES (?, ?, ?, ?)',
      [user_id, message.trim(), true, false]
    );

    res.json({
      success: true,
      id: result.insertId,
      message: 'Răspuns trimis cu succes'
    });
  } catch (error) {
    console.error('Eroare trimitere răspuns:', error);
    res.status(500).json({ error: 'Eroare la trimiterea răspunsului' });
  }
});

// Mark messages as read
app.put('/api/messages/mark-read', async (req, res) => {
  try {
    const { user_id, message_ids } = req.body;
    
    if (!user_id && !message_ids) {
      return res.status(400).json({ error: 'Trebuie să furnizați fie user_id, fie message_ids' });
    }

    if (user_id) {
      // Marchează toate mesajele necitite ale utilizatorului ca citite
      await pool.execute(
        'UPDATE messages SET `read` = TRUE WHERE user_id = ? AND is_from_admin = FALSE AND `read` = FALSE',
        [user_id]
      );
      console.log('[API] Mesajele utilizatorului', user_id, 'au fost marcate ca citite');
    } else if (message_ids && Array.isArray(message_ids)) {
      // Marchează mesajele specificate ca citite
      const placeholders = message_ids.map(() => '?').join(',');
      await pool.execute(
        `UPDATE messages SET \`read\` = TRUE WHERE id IN (${placeholders}) AND is_from_admin = FALSE`,
        message_ids
      );
      console.log('[API] Mesajele', message_ids, 'au fost marcate ca citite');
    }

    res.json({
      success: true,
      message: 'Mesajele au fost marcate ca citite'
    });
  } catch (error) {
    console.error('Eroare marcare mesaje ca citite:', error);
    res.status(500).json({ error: 'Eroare la marcarea mesajelor ca citite' });
  }
});

// Delete message
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.execute(
      'DELETE FROM messages WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Mesajul nu există' });
    }

    res.json({
      success: true,
      message: 'Mesaj șters cu succes'
    });
  } catch (error) {
    console.error('Eroare ștergere mesaj:', error);
    res.status(500).json({ error: 'Eroare la ștergerea mesajului' });
  }
});

// Delete all messages for a user (delete entire conversation thread)
app.delete('/api/messages/thread/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'ID-ul utilizatorului este obligatoriu' });
    }

    const [result] = await pool.execute(
      'DELETE FROM messages WHERE user_id = ?',
      [userId]
    );

    console.log(`[API] Conversația utilizatorului ${userId} a fost ștearsă (${result.affectedRows} mesaje)`);

    res.json({
      success: true,
      message: `Conversația a fost ștearsă cu succes (${result.affectedRows} mesaje)`,
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error('Eroare ștergere conversație:', error);
    res.status(500).json({ error: 'Eroare la ștergerea conversației' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// ============ AUTO-DELETE OLD MESSAGES (3 DAYS) ============

async function deleteOldMessages() {
  try {
    // Șterge mesajele vechi de peste 3 zile
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const [result] = await pool.execute(
      'DELETE FROM messages WHERE created_at < ?',
      [threeDaysAgo]
    );

    if (result.affectedRows > 0) {
      console.log(`[Auto-cleanup] ${result.affectedRows} mesaje vechi (peste 3 zile) au fost șterse`);
    }
  } catch (error) {
    console.error('[Auto-cleanup] Eroare la ștergerea mesajelor vechi:', error);
  }
}

// Rulează cleanup-ul o dată pe oră (3600000 ms = 1 oră)
// Primul cleanup se execută după 1 minut de la pornirea serverului
setTimeout(() => {
  deleteOldMessages(); // Primul cleanup imediat după 1 minut
  setInterval(deleteOldMessages, 60 * 60 * 1000); // Apoi la fiecare oră
}, 60 * 1000);

// Start server - ascultă pe toate interfețele pentru acces din rețea
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server rulează pe portul ${PORT}`);
  console.log(`📡 API disponibil la:`);
  console.log(`   - http://localhost:${PORT}/api`);
  console.log(`   - http://127.0.0.1:${PORT}/api`);
  console.log(`\n🎨 Admin Panel disponibil la:`);
  console.log(`   - http://localhost:${PORT}/admin`);
  console.log(`   - http://127.0.0.1:${PORT}/admin`);
  console.log(`\n💡 Pentru device-uri fizice, folosește IP-ul local al acestui computer`);
  console.log(`   (ex: http://192.168.1.100:${PORT}/api)`);
  console.log(`   Admin: http://192.168.0.148:${PORT}/admin`);
  console.log(`\n🧹 Auto-cleanup: Mesajele vechi de peste 3 zile vor fi șterse automat (la fiecare oră)`);
});

