/**
 * services/auth.service.js
 * -------------------------------------------------------
 * Logika bisnis autentikasi: registrasi, login, reset password.
 * Mengikuti FR-1.1 s.d. FR-1.4 dan kebutuhan non-fungsional
 * Security (password di-hash bcrypt, token reset punya masa
 * berlaku terbatas).
 * -------------------------------------------------------
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../config/database');

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MINUTES = 30;

function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
}

function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

async function registerUser({ name, email, password }) {
  const existing = findUserByEmail(email);
  if (existing) {
    const err = new Error('Email sudah terdaftar. Silakan gunakan email lain atau masuk.');
    err.code = 'EMAIL_TAKEN';
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const stmt = db.prepare(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
  );
  const info = stmt.run(name.trim(), email.toLowerCase().trim(), passwordHash);
  return findUserById(info.lastInsertRowid);
}

async function verifyLogin(email, password) {
  const user = findUserByEmail(email);
  if (!user) return null;
  const match = await bcrypt.compare(password, user.password_hash);
  return match ? user : null;
}

async function updateProfile(userId, { name, email, photoUrl }) {
  db.prepare('UPDATE users SET name = ?, email = ?, photo_url = ? WHERE id = ?').run(
    name.trim(),
    email.toLowerCase().trim(),
    photoUrl || null,
    userId
  );
  return findUserById(userId);
}

async function changePassword(userId, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
}

/**
 * FR-1.3: Membuat token reset password dengan masa berlaku terbatas
 * (bukan mengirim password asli — sesuai kebutuhan non-fungsional Security).
 */
function createPasswordResetToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

  db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(userId);
  db.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)').run(
    userId,
    token,
    expiresAt
  );

  return token;
}

function validateResetToken(token) {
  const row = db.prepare('SELECT * FROM password_resets WHERE token = ?').get(token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM password_resets WHERE id = ?').run(row.id);
    return null;
  }
  return row;
}

function consumeResetToken(token) {
  db.prepare('DELETE FROM password_resets WHERE token = ?').run(token);
}

module.exports = {
  findUserByEmail,
  findUserById,
  registerUser,
  verifyLogin,
  updateProfile,
  changePassword,
  createPasswordResetToken,
  validateResetToken,
  consumeResetToken,
};
