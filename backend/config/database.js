/**
 * config/database.js
 * -------------------------------------------------------
 * Konfigurasi koneksi database. Menggunakan SQLite (better-sqlite3)
 * sebagai pengganti ringan dari Supabase/PostgreSQL yang disebut
 * pada dokumen jurnal acuan — dipilih agar proyek dapat langsung
 * dijalankan dosen penguji tanpa perlu setup server database
 * eksternal. Struktur tabel mengikuti skema data pada PRD
 * (bagian 8: Skema Data).
 * -------------------------------------------------------
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const env = require('./env');

const dbDir = path.dirname(env.databasePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(env.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Skema database — dijalankan sekali saat aplikasi start.
 * Aman dipanggil berulang kali karena memakai IF NOT EXISTS.
 */
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      photo_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS outlines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      topic TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'draft', -- draft | lengkap
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS outline_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      outline_id INTEGER NOT NULL,
      level_order INTEGER NOT NULL,
      level_title TEXT NOT NULL,
      FOREIGN KEY (outline_id) REFERENCES outlines(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS outline_subtopics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      sub_order INTEGER NOT NULL,
      FOREIGN KEY (level_id) REFERENCES outline_levels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS course_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subtopic_id INTEGER NOT NULL UNIQUE,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subtopic_id) REFERENCES outline_subtopics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recommended_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subtopic_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      video_id_youtube TEXT NOT NULL,
      thumbnail_url TEXT,
      url TEXT,
      FOREIGN KEY (subtopic_id) REFERENCES outline_subtopics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      outline_id INTEGER NOT NULL,
      role TEXT NOT NULL, -- 'user' | 'ai'
      message TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (outline_id) REFERENCES outlines(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_outlines_user ON outlines(user_id);
    CREATE INDEX IF NOT EXISTS idx_levels_outline ON outline_levels(outline_id);
    CREATE INDEX IF NOT EXISTS idx_subtopics_level ON outline_subtopics(level_id);
    CREATE INDEX IF NOT EXISTS idx_chat_outline ON chat_history(outline_id);
  `);

  console.log('✅ [config/database] Skema database siap.');
}

module.exports = { db, initSchema };
