/**
 * Stocare credențiale admin – fișier JSON (username + hash parolă)
 * Implicit: admin / admin
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const dataDir = path.join(__dirname, '..', 'data');
const filePath = path.join(dataDir, 'admin.json');

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin';

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function getCredentials() {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
    const data = { username: DEFAULT_USERNAME, passwordHash };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return data;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function verifyPassword(username, password) {
  const cred = getCredentials();
  if (cred.username !== username) return false;
  return bcrypt.compareSync(password, cred.passwordHash);
}

function updatePassword(currentPassword, newPassword) {
  const cred = getCredentials();
  if (!bcrypt.compareSync(currentPassword, cred.passwordHash)) {
    return false;
  }
  cred.passwordHash = bcrypt.hashSync(newPassword, 10);
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(cred, null, 2), 'utf8');
  return true;
}

module.exports = { getCredentials, verifyPassword, updatePassword, DEFAULT_USERNAME };
