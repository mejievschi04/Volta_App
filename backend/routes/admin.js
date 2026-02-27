/**
 * Rute admin – login (user/parolă), verificare token, schimbare parolă, mesaje (ștergere thread)
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { requireAdmin } = require('../middleware/adminAuth');
const { verifyPassword, updatePassword } = require('../lib/adminCredentials');
const messagesController = require('../controllers/messagesController');

const router = express.Router();

/** Limitare încercări login admin: 5 pe 15 min per IP (anti brute-force) */
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Prea multe încercări de conectare. Încearcă din nou în 15 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** POST /api/admin/login – body: { username, password }, returnează { token } */
router.post('/login', adminLoginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Utilizator și parolă obligatorii' });
  }
  if (!verifyPassword(String(username).trim(), password)) {
    return res.status(401).json({ error: 'Utilizator sau parolă incorectă' });
  }
  const token = jwt.sign(
    { admin: true },
    config.jwt.secret,
    { expiresIn: config.jwt.adminExpiresIn || '7d' }
  );
  res.json({ token });
});

/** GET /api/admin/verify – verifică token (X-Admin-Key); 200 dacă e valid */
router.get('/verify', requireAdmin, (req, res) => {
  res.json({ ok: true });
});

/** PUT /api/admin/password – schimbă parola; body: { currentPassword, newPassword } */
router.put('/password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Parola curentă și cea nouă sunt obligatorii' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Parola nouă trebuie să aibă minim 6 caractere' });
  }
  const ok = updatePassword(currentPassword, newPassword);
  if (!ok) return res.status(401).json({ error: 'Parola curentă este incorectă' });
  res.json({ ok: true });
});

/** DELETE /api/admin/messages/thread/:userId – șterge conversația cu utilizatorul (admin) */
router.delete('/messages/thread/:userId', requireAdmin, messagesController.removeThread);

module.exports = router;
